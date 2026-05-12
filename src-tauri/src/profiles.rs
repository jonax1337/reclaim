//! Curated tweak profiles: named bundles like "Gaming", "Privacy Max" that
//! resolve to a list of tweak IDs at query time. Profiles are defined as
//! (preset name) ∩ (set of categories), so they auto-extend as new catalog
//! entries arrive without requiring manual ID maintenance.

use crate::catalog::{self, Category};
use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    /// Lucide/Fluent icon name shown in the profile picker.
    pub icon: String,
    pub description: String,
    /// Preset name (e.g. "minimal", "recommended", "aggressive") to intersect with.
    pub preset: String,
    /// Catalog categories this profile spans. Tweaks outside these categories
    /// are not included even if they're in the preset.
    pub categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedProfile {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub description: String,
    /// Tweak IDs the profile resolves to right now.
    pub tweak_ids: Vec<String>,
}

fn definitions() -> Vec<Profile> {
    serde_json::from_str(include_str!("../tweaks/profiles.json")).unwrap_or_default()
}

fn cat_to_str(c: Category) -> String {
    serde_json::to_value(c).ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default()
}

pub fn list() -> AppResult<Vec<ResolvedProfile>> {
    let cat = catalog::catalog();
    let defs = definitions();
    let mut out = Vec::with_capacity(defs.len());
    for p in defs {
        let mut ids: Vec<String> = cat
            .values()
            .filter(|t| {
                p.categories.iter().any(|c| c == &cat_to_str(t.category))
                    && t.presets.iter().any(|pr| pr == &p.preset)
            })
            .map(|t| t.id.clone())
            .collect();
        ids.sort();
        out.push(ResolvedProfile {
            id: p.id,
            name: p.name,
            icon: p.icon,
            description: p.description,
            tweak_ids: ids,
        });
    }
    Ok(out)
}
