//! AppX (UWP) package operations. There is no Win32 equivalent for `Get-AppxPackage`,
//! so we batch into a single PowerShell invocation.

use crate::catalog::AppxOp;
use crate::error::AppResult;
use crate::powershell;

pub fn remove(op: &AppxOp) -> AppResult<()> {
    let mut script = format!(
        "Get-AppxPackage -Name '{}' -AllUsers | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue;",
        op.package
    );
    if op.remove_provisioned {
        script.push_str(&format!(
            " Get-AppxProvisionedPackage -Online | Where-Object {{ $_.DisplayName -eq '{}' }} | Remove-AppxProvisionedPackage -Online -AllUsers -ErrorAction SilentlyContinue;",
            op.package
        ));
    }
    powershell::run(&script)?;
    Ok(())
}

/// Reinstall a removed AppX package by re-registering its manifest if still on disk.
pub fn reinstall(package: &str) -> AppResult<()> {
    let script = format!(
        "Get-AppxPackage -AllUsers {} | ForEach-Object {{ Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }}",
        package
    );
    powershell::run(&script)?;
    Ok(())
}
