//! Direct registry I/O via the `winreg` crate. No PowerShell round-trip.

use crate::catalog::{RegHive, RegKind, RegOp};
use crate::error::{AppError, AppResult};

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RegSnapshot {
    /// Registry hive + path of the captured value. Required for identity-based revert.
    #[serde(default)]
    pub hive: Option<RegHive>,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub name: String,
    pub existed: bool,
    pub kind: Option<String>,
    pub value: Option<serde_json::Value>,
}

#[cfg(windows)]
fn root(hive: RegHive) -> RegKey {
    match hive {
        RegHive::HKLM => RegKey::predef(HKEY_LOCAL_MACHINE),
        RegHive::HKCU => RegKey::predef(HKEY_CURRENT_USER),
        RegHive::HKCR => RegKey::predef(HKEY_CLASSES_ROOT),
    }
}

fn identity(op: &RegOp) -> (Option<RegHive>, String, String) {
    (Some(op.hive), op.path.clone(), op.name.clone())
}

/// Read the current value at the given path/name without modifying anything.
pub fn snapshot(op: &RegOp) -> AppResult<RegSnapshot> {
    let (hive, path, name) = identity(op);
    #[cfg(windows)]
    {
        let r = root(op.hive);
        let Ok(key) = r.open_subkey(&op.path) else {
            return Ok(RegSnapshot { hive, path, name, existed: false, kind: None, value: None });
        };
        let Ok(val) = key.get_raw_value(&op.name) else {
            return Ok(RegSnapshot { hive, path, name, existed: false, kind: None, value: None });
        };
        let kind = format!("{:?}", val.vtype);
        let value = match val.vtype {
            REG_DWORD => {
                let bytes: [u8; 4] = val.bytes[..4].try_into().unwrap_or([0; 4]);
                serde_json::json!(u32::from_le_bytes(bytes))
            }
            REG_QWORD => {
                let bytes: [u8; 8] = val.bytes[..8].try_into().unwrap_or([0; 8]);
                serde_json::json!(u64::from_le_bytes(bytes))
            }
            REG_SZ | REG_EXPAND_SZ => {
                let s: String = String::from_utf16_lossy(
                    &val.bytes
                        .chunks_exact(2)
                        .map(|c| u16::from_le_bytes([c[0], c[1]]))
                        .take_while(|c| *c != 0)
                        .collect::<Vec<_>>(),
                );
                serde_json::json!(s)
            }
            _ => serde_json::json!(val.bytes),
        };
        Ok(RegSnapshot { hive, path, name, existed: true, kind: Some(kind), value: Some(value) })
    }
    #[cfg(not(windows))]
    {
        Ok(RegSnapshot { hive, path, name, existed: false, kind: None, value: None })
    }
}

/// Apply a registry op (write, or delete if `op.delete`). Creates intermediate keys.
pub fn apply(op: &RegOp) -> AppResult<()> {
    #[cfg(windows)]
    {
        let r = root(op.hive);
        if op.delete {
            if let Ok(key) = r.open_subkey_with_flags(&op.path, KEY_SET_VALUE) {
                let _ = key.delete_value(&op.name);
            }
            return Ok(());
        }
        let (key, _) = r.create_subkey(&op.path)?;
        match op.kind {
            RegKind::Dword => {
                let n = op
                    .value
                    .as_u64()
                    .ok_or_else(|| AppError::Other("dword expects integer".into()))?;
                key.set_value(&op.name, &(n as u32))?;
            }
            RegKind::QWord => {
                let n = op
                    .value
                    .as_u64()
                    .ok_or_else(|| AppError::Other("qword expects integer".into()))?;
                key.set_value(&op.name, &n)?;
            }
            RegKind::String | RegKind::ExpandString => {
                let s = op
                    .value
                    .as_str()
                    .ok_or_else(|| AppError::Other("string expects string".into()))?;
                key.set_value(&op.name, &s.to_string())?;
            }
            RegKind::Binary => {
                let bytes: Vec<u8> = serde_json::from_value(op.value.clone())
                    .map_err(|e| AppError::Other(format!("binary expects byte array: {e}")))?;
                let raw = winreg::RegValue { bytes, vtype: REG_BINARY };
                key.set_raw_value(&op.name, &raw)?;
            }
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = op;
        Err(AppError::Other("registry only supported on Windows".into()))
    }
}

/// Restore a snapshot using the identity (hive/path/name) carried inside the snapshot itself.
/// Used by revert so the current catalog ordering is irrelevant.
pub fn restore_by_identity(snap: &RegSnapshot) -> AppResult<()> {
    let hive = snap.hive.ok_or_else(|| {
        AppError::Other(format!(
            "backup snapshot for '{}' is missing hive/path metadata — created by an older Reclaim build, please use the System Restore Point",
            snap.name
        ))
    })?;
    if snap.path.is_empty() {
        return Err(AppError::Other(
            "backup snapshot has empty registry path; cannot revert".into(),
        ));
    }
    #[cfg(windows)]
    {
        let r = root(hive);
        if !snap.existed {
            if let Ok(key) = r.open_subkey_with_flags(&snap.path, KEY_SET_VALUE) {
                let _ = key.delete_value(&snap.name);
            }
            return Ok(());
        }
        // Re-create an op from the snapshot. Kind is inferred from the captured RegValue type.
        let kind = match snap.kind.as_deref() {
            Some("REG_DWORD") => RegKind::Dword,
            Some("REG_QWORD") => RegKind::QWord,
            Some("REG_SZ") => RegKind::String,
            Some("REG_EXPAND_SZ") => RegKind::ExpandString,
            _ => RegKind::Binary,
        };
        let op = RegOp {
            hive,
            path: snap.path.clone(),
            name: snap.name.clone(),
            kind,
            value: snap.value.clone().unwrap_or(serde_json::Value::Null),
            delete: false,
        };
        apply(&op)
    }
    #[cfg(not(windows))]
    {
        let _ = hive;
        Ok(())
    }
}

