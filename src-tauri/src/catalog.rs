//! Declarative tweak catalog. Each tweak is a data record describing
//! registry/service/appx mutations + an optional inverse for undo.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Safe,
    Caution,
    Risky,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum Category {
    Privacy,
    Bloatware,
    Performance,
    Explorer,
    Services,
    #[serde(rename = "ai")]
    AI,
    Gaming,
    Search,
    Updates,
    #[serde(rename = "group-policy")]
    GroupPolicy,
    Network,
    Power,
    Edge,
    Annoyances,
    Developer,
    Audio,
    Security,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum RegHive {
    HKLM,
    HKCU,
    HKCR,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RegKind {
    Dword,
    String,
    ExpandString,
    Binary,
    QWord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegOp {
    pub hive: RegHive,
    pub path: String,
    pub name: String,
    pub kind: RegKind,
    /// Value to write when applying the tweak.
    pub value: serde_json::Value,
    /// If `delete: true`, the entry is removed instead of written.
    #[serde(default)]
    pub delete: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStartup {
    Boot,
    System,
    Auto,
    Manual,
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceOp {
    pub name: String,
    pub startup: ServiceStartup,
    #[serde(default)]
    pub stop: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppxOp {
    /// Package family wildcard (e.g. "Microsoft.BingNews").
    pub package: String,
    /// Also remove from the provisioned list so new users don't get it back.
    #[serde(default = "default_true")]
    pub remove_provisioned: bool,
}

fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tweak {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: Category,
    pub severity: Severity,
    /// Names of presets this tweak belongs to (e.g. "minimal", "recommended", "aggressive").
    #[serde(default)]
    pub presets: Vec<String>,
    /// Lowest Windows build number this tweak targets (inclusive).
    #[serde(default)]
    pub min_build: Option<u32>,
    /// Highest Windows build number this tweak targets (inclusive).
    #[serde(default)]
    pub max_build: Option<u32>,

    #[serde(default)]
    pub registry: Vec<RegOp>,
    #[serde(default)]
    pub services: Vec<ServiceOp>,
    #[serde(default)]
    pub appx: Vec<AppxOp>,
    /// Optional raw PowerShell to invoke when applying.
    #[serde(default)]
    pub ps_apply: Option<String>,
    /// Optional raw PowerShell to invoke when reverting.
    #[serde(default)]
    pub ps_revert: Option<String>,
    /// Optional human-readable warning shown in the UI.
    #[serde(default)]
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog {
    #[serde(default)]
    pub tweak: Vec<Tweak>,
}

struct LoadedCatalog {
    tweaks: HashMap<String, Tweak>,
    parse_errors: Vec<String>,
}

static CATALOG: OnceLock<LoadedCatalog> = OnceLock::new();

fn load() -> &'static LoadedCatalog {
    CATALOG.get_or_init(|| {
        let mut tweaks: HashMap<String, Tweak> = HashMap::new();
        let mut parse_errors: Vec<String> = Vec::new();
        for (name, src) in TWEAK_FILES {
            match toml::from_str::<Catalog>(src) {
                Ok(c) => {
                    for t in c.tweak {
                        if let Some(existing) = tweaks.get(&t.id) {
                            tracing::warn!(id = %t.id, "duplicate tweak id; overwriting {:?}", existing.name);
                        }
                        tweaks.insert(t.id.clone(), t);
                    }
                }
                Err(e) => {
                    let msg = format!("{name}: {e}");
                    tracing::error!(error = %msg, "failed to parse tweak catalog file");
                    parse_errors.push(msg);
                }
            }
        }
        LoadedCatalog { tweaks, parse_errors }
    })
}

/// Embeds every TOML file under `tweaks/` at compile time so the binary is self-contained.
pub fn catalog() -> &'static HashMap<String, Tweak> {
    &load().tweaks
}

/// Returns any parse errors encountered while loading the catalog. Empty when the catalog is healthy.
pub fn parse_errors() -> &'static [String] {
    &load().parse_errors
}

const TWEAK_FILES: &[(&str, &str)] = &[
    ("privacy.toml", include_str!("../tweaks/privacy.toml")),
    ("bloatware.toml", include_str!("../tweaks/bloatware.toml")),
    ("explorer.toml", include_str!("../tweaks/explorer.toml")),
    ("performance.toml", include_str!("../tweaks/performance.toml")),
    ("ai.toml", include_str!("../tweaks/ai.toml")),
    ("services.toml", include_str!("../tweaks/services.toml")),
    ("updates.toml", include_str!("../tweaks/updates.toml")),
    ("gpo.toml", include_str!("../tweaks/gpo.toml")),
    ("network.toml", include_str!("../tweaks/network.toml")),
    ("power.toml", include_str!("../tweaks/power.toml")),
    ("edge.toml", include_str!("../tweaks/edge.toml")),
    ("privacy2.toml", include_str!("../tweaks/privacy2.toml")),
    ("aggressive.toml", include_str!("../tweaks/aggressive.toml")),
    ("gaming2.toml", include_str!("../tweaks/gaming2.toml")),
    ("annoyances.toml", include_str!("../tweaks/annoyances.toml")),
    ("developer.toml", include_str!("../tweaks/developer.toml")),
    ("audio.toml", include_str!("../tweaks/audio.toml")),
    ("sleeplock.toml", include_str!("../tweaks/sleeplock.toml")),
    ("hardening.toml", include_str!("../tweaks/hardening.toml")),
];
