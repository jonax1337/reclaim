//! Service management via sc.exe — simpler and avoids unsafe blocks for now.

use crate::catalog::{ServiceOp, ServiceStartup};
use crate::error::{AppError, AppResult};
use std::process::Command;

fn startup_arg(s: ServiceStartup) -> &'static str {
    match s {
        ServiceStartup::Boot => "boot",
        ServiceStartup::System => "system",
        ServiceStartup::Auto => "auto",
        ServiceStartup::Manual => "demand",
        ServiceStartup::Disabled => "disabled",
    }
}

pub fn current_startup(name: &str) -> AppResult<Option<ServiceStartup>> {
    let out = Command::new("sc.exe").args(["qc", name]).output()?;
    if !out.status.success() {
        return Ok(None);
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text
        .lines()
        .find(|l| l.contains("START_TYPE"))
        .unwrap_or_default();
    let lower = line.to_lowercase();
    Ok(Some(if lower.contains("disabled") {
        ServiceStartup::Disabled
    } else if lower.contains("auto_start") {
        ServiceStartup::Auto
    } else if lower.contains("demand") {
        ServiceStartup::Manual
    } else if lower.contains("boot") {
        ServiceStartup::Boot
    } else if lower.contains("system") {
        ServiceStartup::System
    } else {
        return Ok(None);
    }))
}

pub fn apply(op: &ServiceOp) -> AppResult<()> {
    // sc.exe requires `start=` and the value as separate tokens.
    let cfg = Command::new("sc.exe")
        .args(["config", &op.name, "start=", startup_arg(op.startup)])
        .output()?;
    if !cfg.status.success() {
        return Err(AppError::Other(format!(
            "sc.exe config {}: {}",
            op.name,
            String::from_utf8_lossy(&cfg.stderr).trim()
        )));
    }
    if op.stop {
        let stop = Command::new("sc.exe").args(["stop", &op.name]).output()?;
        // Exit 1062 = service not running — that's fine, the desired state is reached.
        if !stop.status.success() && stop.status.code() != Some(1062) {
            return Err(AppError::Other(format!(
                "sc.exe stop {}: {}",
                op.name,
                String::from_utf8_lossy(&stop.stderr).trim()
            )));
        }
    }
    Ok(())
}

pub fn set_startup(name: &str, startup: ServiceStartup) -> AppResult<()> {
    apply(&ServiceOp {
        name: name.to_string(),
        startup,
        stop: false,
    })
}
