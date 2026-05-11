//! Live UWP/AppX inventory + curated bloat catalog with reinstall support.

use crate::error::AppResult;
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppxPackage {
    pub name: String,
    pub publisher: String,
    pub version: String,
    pub install_location: Option<String>,
    pub package_full_name: String,
}

/// All AppX packages currently installed for any user.
pub fn list_installed() -> AppResult<Vec<AppxPackage>> {
    let script = r#"Get-AppxPackage -AllUsers | Where-Object { $_.SignatureKind -eq 'Store' -or $_.SignatureKind -eq 'System' } | ForEach-Object {
        [PSCustomObject]@{
            name = $_.Name
            publisher = ($_.Publisher -split ',')[0] -replace '^CN=',''
            version = $_.Version
            install_location = $_.InstallLocation
            package_full_name = $_.PackageFullName
        }
    } | ConvertTo-Json -Compress"#;
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
    let mut out = Vec::with_capacity(arr.len());
    for v in arr {
        if let Ok(p) = serde_json::from_value::<AppxPackage>(v) {
            out.push(p);
        }
    }
    Ok(out)
}

/// Curated catalog of well-known UWP apps that come with Windows. Used to drive
/// the "App Manager" UI: lets the user toggle removal AND restoration.
pub fn known_apps() -> Vec<KnownApp> {
    serde_json::from_str(include_str!("../tweaks/known_apps.json")).unwrap_or_default()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnownApp {
    pub package: String,    // AppX name pattern e.g. "Microsoft.BingNews"
    pub name: String,       // Human label
    pub publisher: String,  // "Microsoft" usually
    pub bloat: bool,        // marked as bloat / safe to remove
    pub category: String,   // "Office", "Gaming", "Media", etc.
    pub description: String,
    /// winget id for re-install fallback (Add-AppxPackage -Register only works
    /// if the manifest is still on disk; for full restoration we use winget).
    #[serde(default)]
    pub winget_id: Option<String>,
}

pub fn reinstall(package: &str, winget_id: Option<&str>) -> AppResult<()> {
    // 1) Try Add-AppxPackage -Register if manifests still live on disk.
    let register = format!(
        r#"$candidates = Get-AppxPackage -AllUsers {p} -ErrorAction SilentlyContinue
$ok = $false
foreach ($c in $candidates) {{
    $m = Join-Path $c.InstallLocation 'AppXManifest.xml'
    if (Test-Path $m) {{
        Add-AppxPackage -DisableDevelopmentMode -Register $m -ErrorAction SilentlyContinue
        $ok = $true
    }}
}}
if (-not $ok) {{ Write-Output 'no-manifest' }} else {{ Write-Output 'registered' }}"#,
        p = package
    );
    let result = powershell::run(&register)?;
    if result.trim() == "registered" {
        return Ok(());
    }
    // 2) Fall back to winget if a known store id was provided.
    if let Some(id) = winget_id {
        let out = std::process::Command::new("winget.exe")
            .args([
                "install", "--id", id, "--exact", "--silent",
                "--accept-package-agreements", "--accept-source-agreements",
            ])
            .output()?;
        if out.status.success() {
            return Ok(());
        }
        return Err(crate::error::AppError::Other(format!(
            "winget reinstall failed: {}",
            String::from_utf8_lossy(&out.stderr)
        )));
    }
    Err(crate::error::AppError::Other(format!(
        "{package}: manifests no longer on disk and no winget id available"
    )))
}
