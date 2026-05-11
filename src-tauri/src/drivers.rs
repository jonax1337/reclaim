//! Driver inventory (all installed PnP drivers) + Windows Update driver scan / install
//! via the Microsoft.Update.Session COM API. No third-party module required.

use crate::error::{AppError, AppResult};
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledDriver {
    pub device: String,
    pub class: String,
    pub manufacturer: String,
    pub provider: String,
    pub version: String,
    pub date: String,
    pub status: String,
}

pub fn list_installed() -> AppResult<Vec<InstalledDriver>> {
    let script = r#"
Get-CimInstance Win32_PnPSignedDriver |
  Where-Object { $_.DeviceName } |
  ForEach-Object {
    [PSCustomObject]@{
      device = $_.DeviceName
      class = "$($_.DeviceClass)"
      manufacturer = "$($_.Manufacturer)"
      provider = "$($_.DriverProviderName)"
      version = "$($_.DriverVersion)"
      date = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { '' }
      status = "$($_.Status)"
    }
  } | ConvertTo-Json -Compress
"#;
    let out = powershell::run(script)?;
    let trimmed = out.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let raw: serde_json::Value = serde_json::from_str(trimmed)?;
    let arr = match raw {
        serde_json::Value::Array(a) => a,
        v @ serde_json::Value::Object(_) => vec![v],
        _ => Vec::new(),
    };
    Ok(arr
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverUpdate {
    pub id: String,
    pub title: String,
    pub size_mb: f64,
    pub driver_class: String,
    pub driver_date: String,
    pub driver_version: String,
    pub manufacturer: String,
    pub is_mandatory: bool,
}

/// Query Windows Update for pending driver updates. Uses the WU COM API so it
/// works on every SKU without the PSWindowsUpdate module.
pub fn scan() -> AppResult<Vec<DriverUpdate>> {
    let script = r#"
$ErrorActionPreference = 'Stop'
$Session = New-Object -ComObject Microsoft.Update.Session
$Searcher = $Session.CreateUpdateSearcher()
# Microsoft Update service (incl. drivers).
$Searcher.ServerSelection = 3
$Searcher.ServiceID = '7971f918-a847-4430-9279-4a52d1efe18d'
$result = $Searcher.Search("IsInstalled=0 and Type='Driver'")
$out = @()
for ($i = 0; $i -lt $result.Updates.Count; $i++) {
    $u = $result.Updates.Item($i)
    $out += [PSCustomObject]@{
        id = $u.Identity.UpdateID
        title = "$($u.Title)"
        size_mb = [math]::Round($u.MaxDownloadSize / 1MB, 2)
        driver_class = "$($u.DriverClass)"
        driver_date = if ($u.DriverVerDate) { $u.DriverVerDate.ToString('yyyy-MM-dd') } else { '' }
        driver_version = "$($u.DriverVerVersion)"
        manufacturer = "$($u.DriverManufacturer)"
        is_mandatory = [bool]$u.IsMandatory
    }
}
$out | ConvertTo-Json -Compress
"#;
    let out = powershell::run(script)?;
    let trimmed = out.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let raw: serde_json::Value = serde_json::from_str(trimmed)?;
    let arr = match raw {
        serde_json::Value::Array(a) => a,
        v @ serde_json::Value::Object(_) => vec![v],
        _ => Vec::new(),
    };
    Ok(arr
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub installed: u32,
    pub failed: u32,
    pub reboot_required: bool,
    pub message: String,
}

/// Download + install the given update IDs (or all if `ids` is empty).
/// This can take minutes. Requires admin.
pub fn install(ids: &[String]) -> AppResult<InstallResult> {
    let filter = if ids.is_empty() {
        "$ToInstall = $result.Updates".to_string()
    } else {
        let json = serde_json::to_string(ids).unwrap();
        format!(
            r#"$wanted = ConvertFrom-Json -InputObject @'
{json}
'@
$ToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
for ($i = 0; $i -lt $result.Updates.Count; $i++) {{
    $u = $result.Updates.Item($i)
    if ($wanted -contains $u.Identity.UpdateID) {{ [void]$ToInstall.Add($u) }}
}}"#
        )
    };

    let script = format!(
        r#"
$ErrorActionPreference = 'Stop'
$Session = New-Object -ComObject Microsoft.Update.Session
$Searcher = $Session.CreateUpdateSearcher()
$Searcher.ServerSelection = 3
$Searcher.ServiceID = '7971f918-a847-4430-9279-4a52d1efe18d'
$result = $Searcher.Search("IsInstalled=0 and Type='Driver'")

{filter}

if ($ToInstall.Count -eq 0) {{
    [PSCustomObject]@{{ installed = 0; failed = 0; reboot_required = $false; message = 'Nothing to install' }} |
        ConvertTo-Json -Compress
    exit
}}

# Mark EULA accepted for each.
foreach ($u in $ToInstall) {{ if (-not $u.EulaAccepted) {{ try {{ $u.AcceptEula() }} catch {{}} }} }}

$Downloader = $Session.CreateUpdateDownloader()
$Downloader.Updates = $ToInstall
[void]$Downloader.Download()

$Installer = $Session.CreateUpdateInstaller()
$Installer.Updates = $ToInstall
$ir = $Installer.Install()

# Per-update results.
$succeeded = 0
$failed = 0
for ($i = 0; $i -lt $ToInstall.Count; $i++) {{
    $code = $ir.GetUpdateResult($i).ResultCode
    if ($code -eq 2 -or $code -eq 3) {{ $succeeded++ }} else {{ $failed++ }}
}}

$msg = switch ($ir.ResultCode) {{
    0 {{ 'Not started' }}
    1 {{ 'In progress' }}
    2 {{ 'Succeeded' }}
    3 {{ 'Succeeded with errors' }}
    4 {{ 'Failed' }}
    5 {{ 'Aborted' }}
    default {{ "Unknown ($($ir.ResultCode))" }}
}}

[PSCustomObject]@{{
    installed = $succeeded
    failed = $failed
    reboot_required = [bool]$ir.RebootRequired
    message = $msg
}} | ConvertTo-Json -Compress
"#
    );

    let out = powershell::run(&script).map_err(|e| {
        AppError::Other(format!("driver install: {e}"))
    })?;
    let r: InstallResult = serde_json::from_str(out.trim())?;
    Ok(r)
}
