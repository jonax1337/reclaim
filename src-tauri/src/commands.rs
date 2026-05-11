//! Tauri command surface — everything the Svelte frontend invokes.

use crate::backup::{self, TweakBackup};
use crate::catalog::{self, ServiceStartup, Tweak};
use crate::error::{AppError, AppResult};
use crate::{appx, drivers, hardware, inventory, powershell, registry, services, startup, system};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TweakState {
    pub id: String,
    pub applied: bool,
}

#[tauri::command]
pub fn list_tweaks() -> Vec<Tweak> {
    let mut v: Vec<Tweak> = catalog::catalog().values().cloned().collect();
    v.sort_by(|a, b| a.category.cmp_key().cmp(&b.category.cmp_key()).then(a.name.cmp(&b.name)));
    v
}

#[tauri::command]
pub fn get_tweak_state(id: String) -> AppResult<TweakState> {
    let applied = backup::load(&id)?.is_some();
    Ok(TweakState { id, applied })
}

#[tauri::command]
pub fn system_info() -> AppResult<system::SystemInfo> {
    system::info()
}

#[tauri::command]
pub fn create_restore_point(label: String) -> AppResult<()> {
    system::create_restore_point(&label)
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivityEntry {
    pub id: String,
    pub name: String,
    pub category: String,
    pub severity: String,
    /// Unix seconds since epoch.
    pub applied_at: i64,
}

#[tauri::command]
pub fn list_activity() -> AppResult<Vec<ActivityEntry>> {
    let entries = backup::list_all()?;
    let cat = catalog::catalog();
    let mut out = Vec::with_capacity(entries.len());
    for (id, ts) in entries {
        let (name, category, severity) = match cat.get(&id) {
            Some(t) => (
                t.name.clone(),
                serde_json::to_value(t.category).ok()
                    .and_then(|v| v.as_str().map(String::from))
                    .unwrap_or_default(),
                serde_json::to_value(t.severity).ok()
                    .and_then(|v| v.as_str().map(String::from))
                    .unwrap_or_default(),
            ),
            None => (id.clone(), String::new(), String::new()),
        };
        out.push(ActivityEntry { id, name, category, severity, applied_at: ts });
    }
    Ok(out)
}

#[tauri::command]
pub fn apply_tweak(id: String) -> AppResult<()> {
    let tweak = catalog::catalog()
        .get(&id)
        .ok_or_else(|| AppError::TweakNotFound(id.clone()))?
        .clone();
    apply_one(&tweak)
}

#[tauri::command]
pub fn revert_tweak(id: String) -> AppResult<()> {
    let Some(b) = backup::load(&id)? else {
        return Ok(());
    };
    // ps_revert is the only revert step that depends on the current catalog. The rest
    // restores purely from the snapshot, so revert keeps working even if the catalog evolved.
    let tweak = catalog::catalog().get(&id).cloned();

    let mut partial: Vec<String> = Vec::new();

    for snap in &b.registry {
        if let Err(e) = registry::restore_by_identity(snap) {
            partial.push(format!("registry {}\\{}: {}", snap.path, snap.name, e));
        }
    }
    for (svc, start) in &b.services {
        if let Some(s) = start {
            if let Err(e) = services::set_startup(svc, *s) {
                partial.push(format!("service {}: {}", svc, e));
            }
        }
    }
    for pkg in &b.appx {
        if let Err(e) = appx::reinstall(pkg) {
            partial.push(format!("appx {}: {}", pkg, e));
        }
    }
    if let Some(t) = &tweak {
        if let Some(ps) = &t.ps_revert {
            if let Err(e) = powershell::run(ps) {
                partial.push(format!("ps_revert: {}", e));
            }
        }
    }

    if partial.is_empty() {
        backup::delete(&id)?;
        Ok(())
    } else {
        Err(AppError::Other(format!(
            "partial revert: {}",
            partial.join("; ")
        )))
    }
}

#[tauri::command]
pub fn apply_batch(ids: Vec<String>) -> AppResult<Vec<(String, bool, Option<String>)>> {
    let mut results = Vec::with_capacity(ids.len());
    for id in ids {
        let r = catalog::catalog()
            .get(&id)
            .cloned()
            .ok_or_else(|| AppError::TweakNotFound(id.clone()))
            .and_then(|t| apply_one(&t));
        match r {
            Ok(()) => results.push((id, true, None)),
            Err(e) => results.push((id, false, Some(e.to_string()))),
        }
    }
    Ok(results)
}

/// Apply a single tweak. The backup file is flushed after every successful op
/// so a mid-flight failure still leaves a recoverable journal of what was applied.
fn apply_one(t: &Tweak) -> AppResult<()> {
    let mut b = TweakBackup {
        applied_at: now_unix(),
        ..Default::default()
    };
    // Persist an empty journal up front so that even the very first op being recorded
    // can be reverted from disk.
    backup::save(&t.id, &b)?;

    for op in &t.registry {
        let snap = registry::snapshot(op)?;
        b.registry.push(snap);
        backup::save(&t.id, &b)?;
        registry::apply(op)?;
    }
    for svc in &t.services {
        let cur = services::current_startup(&svc.name).ok().flatten();
        b.services.push((svc.name.clone(), cur));
        backup::save(&t.id, &b)?;
        services::apply(svc)?;
    }
    for a in &t.appx {
        b.appx.push(a.package.clone());
        backup::save(&t.id, &b)?;
        appx::remove(a)?;
    }
    if let Some(ps) = &t.ps_apply {
        powershell::run(ps)?;
    }
    Ok(())
}

fn now_unix() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ---------- Winget ----------

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct WingetApp {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub homepage: Option<String>,
}

#[tauri::command]
pub fn list_winget_apps() -> Vec<WingetApp> {
    serde_json::from_str(include_str!("../tweaks/apps.json")).unwrap_or_default()
}

#[tauri::command]
pub fn install_winget_app(id: String) -> AppResult<()> {
    let out = std::process::Command::new("winget.exe")
        .args([
            "install",
            "--id",
            &id,
            "--exact",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])
        .output()?;
    if !out.status.success() {
        return Err(AppError::Other(format!(
            "winget exit {}: {}",
            out.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&out.stderr)
        )));
    }
    Ok(())
}

// ---------- Service browser ----------

#[derive(Debug, Clone, Serialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: String,
    pub startup: String,
}

#[tauri::command]
pub fn set_service_startup(name: String, startup: String) -> AppResult<()> {
    let s = match startup.to_lowercase().as_str() {
        "boot" => ServiceStartup::Boot,
        "system" => ServiceStartup::System,
        "auto" | "automatic" => ServiceStartup::Auto,
        "manual" | "demand" => ServiceStartup::Manual,
        "disabled" => ServiceStartup::Disabled,
        other => return Err(AppError::Other(format!("unknown startup: {other}"))),
    };
    services::set_startup(&name, s)
}

#[tauri::command]
pub fn start_service(name: String) -> AppResult<()> {
    let _ = std::process::Command::new("sc.exe").args(["start", &name]).output()?;
    Ok(())
}

#[tauri::command]
pub fn stop_service(name: String) -> AppResult<()> {
    let _ = std::process::Command::new("sc.exe").args(["stop", &name]).output()?;
    Ok(())
}

#[tauri::command]
pub fn list_services() -> AppResult<Vec<ServiceInfo>> {
    // Force string conversion of enum fields so JSON is predictable across PS versions.
    let script = r#"Get-Service | ForEach-Object { [PSCustomObject]@{
        name = $_.Name
        display_name = $_.DisplayName
        status = $_.Status.ToString()
        startup = $_.StartType.ToString()
    } } | ConvertTo-Json -Compress"#;
    let out = powershell::run(script)?;
    let trimmed = out.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    // Single service => object, many => array. Normalise.
    let raw: serde_json::Value = serde_json::from_str(trimmed)?;
    let arr = match raw {
        serde_json::Value::Array(a) => a,
        v @ serde_json::Value::Object(_) => vec![v],
        _ => Vec::new(),
    };
    let mut svcs = Vec::with_capacity(arr.len());
    for v in arr {
        svcs.push(ServiceInfo {
            name: v.get("name").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            display_name: v.get("display_name").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            status: v.get("status").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            startup: v.get("startup").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        });
    }
    Ok(svcs)
}

// helper used in catalog sort
impl crate::catalog::Category {
    fn cmp_key(&self) -> u8 {
        use crate::catalog::Category::*;
        match self {
            Privacy => 0,
            AI => 1,
            Bloatware => 2,
            Search => 3,
            Explorer => 4,
            Performance => 5,
            Gaming => 6,
            Services => 7,
            Updates => 8,
            GroupPolicy => 9,
            Network => 10,
            Power => 11,
            Edge => 12,
            Annoyances => 13,
            Developer => 14,
            Audio => 15,
            Security => 16,
        }
    }
}

// silence unused-import warnings in non-windows dev:
#[allow(dead_code)]
fn _avoid_dead(_: ServiceStartup) {}

// ---------- App Manager (UWP inventory + reinstall) ----------

#[derive(Debug, Clone, Serialize)]
pub struct AppEntry {
    pub package: String,
    pub name: String,
    pub publisher: String,
    pub category: String,
    pub description: String,
    pub bloat: bool,
    pub installed: bool,
    pub version: Option<String>,
    pub winget_id: Option<String>,
}

#[tauri::command]
pub fn list_apps_inventory() -> AppResult<Vec<AppEntry>> {
    let known = inventory::known_apps();
    let installed = inventory::list_installed().unwrap_or_default();

    let mut by_pkg: std::collections::HashMap<String, &inventory::AppxPackage> =
        std::collections::HashMap::new();
    for p in &installed {
        by_pkg.insert(p.name.clone(), p);
    }

    let mut out: Vec<AppEntry> = known
        .iter()
        .map(|k| {
            let pkg = by_pkg.get(&k.package).copied();
            AppEntry {
                package: k.package.clone(),
                name: k.name.clone(),
                publisher: k.publisher.clone(),
                category: k.category.clone(),
                description: k.description.clone(),
                bloat: k.bloat,
                installed: pkg.is_some(),
                version: pkg.map(|p| p.version.clone()),
                winget_id: k.winget_id.clone(),
            }
        })
        .collect();

    // Append installed apps not in our curated list (so the user can still see
    // and remove them). Kept at the bottom and tagged as "Other".
    let known_set: std::collections::HashSet<&str> =
        known.iter().map(|k| k.package.as_str()).collect();
    for p in &installed {
        if known_set.contains(p.name.as_str()) {
            continue;
        }
        // Skip framework / runtime packages — they're noise.
        if p.name.starts_with("Microsoft.VCLibs")
            || p.name.starts_with("Microsoft.NET")
            || p.name.starts_with("Microsoft.UI.Xaml")
            || p.name.starts_with("Microsoft.Services.Store")
            || p.publisher.contains("Microsoft Windows")
            || p.name.starts_with("MicrosoftWindows.UndockedDevKit")
        {
            continue;
        }
        out.push(AppEntry {
            package: p.name.clone(),
            name: p.name.clone(),
            publisher: p.publisher.clone(),
            category: "Other".into(),
            description: String::new(),
            bloat: false,
            installed: true,
            version: Some(p.version.clone()),
            winget_id: None,
        });
    }
    out
        .sort_by(|a, b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
    Ok(out)
}

#[tauri::command]
pub fn install_known_app(package: String, winget_id: Option<String>) -> AppResult<()> {
    inventory::reinstall(&package, winget_id.as_deref())
}

#[tauri::command]
pub fn remove_app_package(package: String) -> AppResult<()> {
    let op = crate::catalog::AppxOp { package, remove_provisioned: true };
    appx::remove(&op)
}

// ---------- Startup apps ----------

#[tauri::command]
pub fn list_startup() -> AppResult<Vec<startup::StartupItem>> {
    startup::list()
}

#[tauri::command]
pub fn set_startup_enabled(scope: String, name: String, enabled: bool) -> AppResult<()> {
    startup::set_enabled(&scope, &name, enabled)
}

// ---------- Hardware ----------

#[tauri::command]
pub fn hardware_info() -> AppResult<hardware::HardwareInfo> {
    hardware::info()
}

// ---------- Drivers ----------

#[tauri::command]
pub fn list_drivers() -> AppResult<Vec<drivers::InstalledDriver>> {
    drivers::list_installed()
}

#[tauri::command]
pub fn scan_driver_updates() -> AppResult<Vec<drivers::DriverUpdate>> {
    drivers::scan()
}

#[tauri::command]
pub fn install_driver_updates(ids: Vec<String>) -> AppResult<drivers::InstallResult> {
    drivers::install(&ids)
}
