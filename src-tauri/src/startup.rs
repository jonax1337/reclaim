//! Startup apps: programs that run at login. Sources we cover:
//! - HKCU\Software\Microsoft\Windows\CurrentVersion\Run
//! - HKLM\Software\Microsoft\Windows\CurrentVersion\Run
//! - The %APPDATA% and %ALLUSERSPROFILE% Start Menu \ Programs \ Startup folders
//! - StartupApproved keys (which is what the Task Manager actually consults
//!   when deciding "enabled / disabled").

use crate::error::AppResult;
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    pub source: String,    // "HKCU Run", "HKLM Run", "Startup Folder"
    pub user: String,      // "Current user" / "All users"
    pub enabled: bool,
}

pub fn list() -> AppResult<Vec<StartupItem>> {
    let script = r#"
$items = @()

function Test-Approved($scope, $name) {
    $key = if ($scope -eq 'HKCU') { 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' }
           else { 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' }
    $v = Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue
    if ($null -eq $v) { return $true }       # no approval entry → enabled
    $bytes = $v.$name
    if ($bytes.Length -lt 1) { return $true }
    return ($bytes[0] -eq 2)                 # 02 = enabled, 03 = disabled
}

function Read-Run($path, $scope, $userLabel) {
    if (-not (Test-Path $path)) { return }
    $vals = Get-Item -Path $path
    foreach ($n in $vals.Property) {
        $script:items += [PSCustomObject]@{
            name = $n
            command = (Get-ItemProperty -Path $path -Name $n).$n
            source = "$scope Run"
            user = $userLabel
            enabled = (Test-Approved $scope $n)
        }
    }
}

Read-Run 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' 'HKCU' 'Current user'
Read-Run 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' 'HKLM' 'All users'

$folders = @(
    @{ p = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"; u = 'Current user' },
    @{ p = "$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\Startup"; u = 'All users' }
)
foreach ($f in $folders) {
    if (Test-Path $f.p) {
        Get-ChildItem -LiteralPath $f.p -File | ForEach-Object {
            $items += [PSCustomObject]@{
                name = $_.Name
                command = $_.FullName
                source = 'Startup folder'
                user = $f.u
                enabled = $true
            }
        }
    }
}

$items | ConvertTo-Json -Compress
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
    let mut out = Vec::with_capacity(arr.len());
    for v in arr {
        if let Ok(it) = serde_json::from_value::<StartupItem>(v) {
            out.push(it);
        }
    }
    Ok(out)
}

/// Toggle a Run-key entry by writing the StartupApproved binary value
/// (02 00 ... = enabled, 03 00 ... = disabled). This is exactly what
/// Task Manager / Settings > Startup do.
pub fn set_enabled(scope: &str, name: &str, enabled: bool) -> AppResult<()> {
    let key = if scope.eq_ignore_ascii_case("hkcu") {
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"
    } else {
        "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"
    };
    let leading = if enabled { "02" } else { "03" };
    let script = format!(
        r#"if (-not (Test-Path '{key}')) {{ New-Item -Path '{key}' -Force | Out-Null }}
$bytes = [byte[]] @(0x{leading},0,0,0,0,0,0,0,0,0,0,0)
Set-ItemProperty -Path '{key}' -Name '{name}' -Value $bytes -Type Binary -Force"#,
        key = key,
        leading = leading,
        name = name.replace('\'', "''")
    );
    powershell::run(&script)?;
    Ok(())
}
