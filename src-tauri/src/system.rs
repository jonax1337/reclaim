//! Windows version detection + restore points.

use crate::error::AppResult;
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub os_name: String,
    pub edition: String,
    pub version: String,
    pub build: u32,
    pub is_admin: bool,
}

pub fn info() -> AppResult<SystemInfo> {
    #[cfg(windows)]
    {
        let script = r#"
            $os = Get-CimInstance Win32_OperatingSystem
            $build = [int]([System.Environment]::OSVersion.Version.Build)
            $admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
            $obj = [PSCustomObject]@{
                os_name = $os.Caption
                edition = $os.OperatingSystemSKU.ToString()
                version = $os.Version
                build = $build
                is_admin = $admin
            }
            $obj | ConvertTo-Json -Compress
        "#;
        let out = powershell::run(script)?;
        let info: SystemInfo = serde_json::from_str(out.trim())?;
        Ok(info)
    }
    #[cfg(not(windows))]
    {
        Ok(SystemInfo {
            os_name: "Non-Windows".into(),
            edition: "0".into(),
            version: "0.0.0".into(),
            build: 0,
            is_admin: false,
        })
    }
}

pub fn create_restore_point(label: &str) -> AppResult<()> {
    let script = format!(
        r#"Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue;
           Checkpoint-Computer -Description "{}" -RestorePointType "MODIFY_SETTINGS""#,
        label.replace('"', "'")
    );
    powershell::run(&script)?;
    Ok(())
}
