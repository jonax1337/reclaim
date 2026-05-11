//! Thin wrapper around `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass`.

use crate::error::{AppError, AppResult};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn run(script: &str) -> AppResult<String> {
    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output()?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        return Err(AppError::PowerShell(output.status.code().unwrap_or(-1), stderr));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
