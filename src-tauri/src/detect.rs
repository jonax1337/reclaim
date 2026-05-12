//! Live detection of tweak state. Reads the actual system (registry, services,
//! AppX inventory) and compares against each tweak's desired mutations to derive
//! one of four states. Independent of the backup journal — works even if the
//! tweak was applied (or reverted) by something other than this app.

use crate::catalog::{self, Tweak};
use crate::error::AppResult;
use crate::{appx, registry, services};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DetectionState {
    /// Every op in the tweak matches the desired state.
    Applied,
    /// No op in the tweak matches the desired state — system is at default.
    NotApplied,
    /// Some ops match, some don't — partially applied or modified by another tool.
    Modified,
    /// Tweak has no detectable ops (e.g. only ps_apply). State can't be inferred.
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
pub struct TweakStatus {
    pub id: String,
    pub state: DetectionState,
    /// How many ops were inspected (registry + services + appx).
    pub ops_total: u32,
    /// How many of those match the desired state.
    pub ops_matching: u32,
}

fn detect_one(t: &Tweak, installed_appx: &HashSet<String>) -> TweakStatus {
    let mut total: u32 = 0;
    let mut matching: u32 = 0;

    for op in &t.registry {
        total += 1;
        if registry::matches_desired(op).unwrap_or(false) {
            matching += 1;
        }
    }
    for svc in &t.services {
        total += 1;
        if services::matches_desired(svc).unwrap_or(false) {
            matching += 1;
        }
    }
    for a in &t.appx {
        total += 1;
        // "Applied" for an appx removal op means the package is NOT installed.
        if !installed_appx.contains(&a.package) {
            matching += 1;
        }
    }

    let state = if total == 0 {
        DetectionState::Unknown
    } else if matching == total {
        DetectionState::Applied
    } else if matching == 0 {
        DetectionState::NotApplied
    } else {
        DetectionState::Modified
    };

    TweakStatus { id: t.id.clone(), state, ops_total: total, ops_matching: matching }
}

/// Bulk-detect every tweak in the catalog. Pre-fetches the AppX inventory once
/// to avoid spawning PowerShell N times.
pub fn detect_all() -> AppResult<Vec<TweakStatus>> {
    let installed = appx::installed_names().unwrap_or_default();
    let cat = catalog::catalog();
    let mut out: Vec<TweakStatus> = cat.values().map(|t| detect_one(t, &installed)).collect();
    out.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(out)
}

/// Detect a single tweak. Convenient for refresh-after-apply.
pub fn detect_single(id: &str) -> AppResult<Option<TweakStatus>> {
    let cat = catalog::catalog();
    let Some(t) = cat.get(id) else { return Ok(None) };
    let installed = appx::installed_names().unwrap_or_default();
    Ok(Some(detect_one(t, &installed)))
}

/// Map of id → status, for ergonomic lookups.
pub fn detect_map() -> AppResult<HashMap<String, TweakStatus>> {
    Ok(detect_all()?.into_iter().map(|s| (s.id.clone(), s)).collect())
}
