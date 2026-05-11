//! Per-tweak undo journal. Snapshots are kept in `%APPDATA%\Reclaim\backups\<id>.json`
//! so that revert works even after the app restarts.

use crate::catalog::ServiceStartup;
use crate::error::{AppError, AppResult};
use crate::registry::RegSnapshot;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Current backup-file schema. Bump when the layout changes in a non-additive way.
/// Older files are deleted on load (hard-break migration; pre-beta has no install base).
pub const SCHEMA_VERSION: u32 = 2;

fn schema_v1() -> u32 { 1 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TweakBackup {
    /// Schema version this file was written with. Defaults to v1 for legacy files.
    #[serde(default = "schema_v1")]
    pub schema: u32,
    #[serde(default)]
    pub registry: Vec<RegSnapshot>,
    #[serde(default)]
    pub services: Vec<(String, Option<ServiceStartup>)>,
    /// List of removed appx package names. We can attempt re-register via stored manifests.
    #[serde(default)]
    pub appx: Vec<String>,
    /// Unix seconds since epoch.
    #[serde(default)]
    pub applied_at: i64,
}

impl Default for TweakBackup {
    fn default() -> Self {
        Self {
            schema: SCHEMA_VERSION,
            registry: Vec::new(),
            services: Vec::new(),
            appx: Vec::new(),
            applied_at: 0,
        }
    }
}

fn dir() -> AppResult<PathBuf> {
    let appdata = std::env::var_os("APPDATA")
        .ok_or_else(|| AppError::Other("APPDATA environment variable not set".into()))?;
    let mut p = PathBuf::from(appdata);
    p.push("Reclaim");
    p.push("backups");
    fs::create_dir_all(&p)?;
    Ok(p)
}

fn path_for(id: &str) -> AppResult<PathBuf> {
    let mut p = dir()?;
    p.push(format!("{id}.json"));
    Ok(p)
}

pub fn save(id: &str, b: &TweakBackup) -> AppResult<()> {
    fs::write(path_for(id)?, serde_json::to_string_pretty(b)?)?;
    Ok(())
}

pub fn load(id: &str) -> AppResult<Option<TweakBackup>> {
    let path = path_for(id)?;
    if !path.exists() {
        return Ok(None);
    }
    let s = fs::read_to_string(&path)?;
    match serde_json::from_str::<TweakBackup>(&s) {
        Ok(b) if b.schema >= SCHEMA_VERSION => Ok(Some(b)),
        // Either unparseable or older schema → invalidate the file.
        _ => {
            let _ = fs::remove_file(&path);
            Ok(None)
        }
    }
}

pub fn delete(id: &str) -> AppResult<()> {
    let path = path_for(id)?;
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

/// All known backups (i.e. applied tweaks) along with the unix-seconds timestamp.
/// Files from older schema versions are deleted as a side-effect (hard-break migration).
pub fn list_all() -> AppResult<Vec<(String, i64)>> {
    let d = dir()?;
    let mut out = Vec::new();
    let Ok(read) = fs::read_dir(&d) else {
        return Ok(out);
    };
    for entry in read.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let id = match path.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };
        let parsed = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<TweakBackup>(&s).ok());
        match parsed {
            Some(b) if b.schema >= SCHEMA_VERSION => out.push((id, b.applied_at)),
            _ => {
                let _ = fs::remove_file(&path);
            }
        }
    }
    out.sort_by(|a, b| b.1.cmp(&a.1));
    Ok(out)
}
