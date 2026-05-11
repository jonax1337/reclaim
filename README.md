<div align="center">

# Reclaim

**Reclaim your Windows.**

A modern, safe Windows 11 tweaker built with **Tauri 2 + Svelte 5** and a **Fluent / Mica** UI.

[![Build](https://github.com/jonax1337/reclaim/actions/workflows/build.yml/badge.svg)](https://github.com/jonax1337/reclaim/actions/workflows/build.yml)
[![Release](https://github.com/jonax1337/reclaim/actions/workflows/release.yml/badge.svg)](https://github.com/jonax1337/reclaim/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%2011-0078D4)
![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)

</div>

---

> **Status: v0.1 — early release.** Reverting is best-effort: registry and service tweaks
> restore cleanly via per-tweak snapshots; AppX removals re-register from on-disk manifests
> where available. The optional **System Restore Point** taken before a batch apply is the
> primary safety net — Reclaim's own revert is the convenience layer.
>
> **Builds on Windows only** (Tauri targets the host OS).

---

## Features

- **Privacy & Telemetry** — disable diagnostic data, advertising ID, tailored experiences, activity history, feedback prompts.
- **Bloatware** — uninstall pre-installed UWP apps (Bing News/Weather, Solitaire, Get Office, Get Help, Feedback Hub, Groove, Movies & TV, Xbox suite, Widgets) for **all users + provisioned** — they don't come back on new accounts.
- **AI** — disable Windows Copilot, uninstall the Copilot app, disable Recall (24H2+).
- **Explorer** — show file extensions, show hidden files, classic right-click menu, taskbar-left, kill Bing in Start Menu.
- **Performance** — visual-effects best-perf, no startup delay, Ultimate Performance power plan.
- **Services** — disable Remote Registry / ICS / Offline Files, set MapsBroker manual, etc.
- **Install Apps** — curated `winget` list (browsers, dev tools, media, comms, gaming, security) with one-click silent install.

Every tweak shows what it does, has a **severity badge** (Safe / Caution / Risky), and is **fully reversible**:

- Per-tweak backup is stored in `%APPDATA%\Reclaim\backups\<id>.json` (registry snapshots, prior service start type, removed AppX names) so reverting works after restarts.
- Optional **System Restore Point** before each batch (`Checkpoint-Computer`).

---

## Download

Grab the latest installer from the [**Releases**](https://github.com/jonax1337/reclaim/releases) page:

- `Reclaim_<version>_x64-setup.exe` — NSIS installer (recommended)
- `Reclaim_<version>_x64_en-US.msi` — MSI installer (for managed deployments)

**Run as Administrator.** Reclaim needs admin for HKLM writes, service config, and provisioned AppX removal. The Dashboard shows a yellow "Not admin" badge if you forget.

---

## Architecture

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Window   | Tauri 2 with **Mica** effect + transparent BG     |
| Frontend | **Svelte 5 (runes)** + TypeScript + SvelteKit static adapter |
| Backend  | **Rust** — `winreg` for registry, `sc.exe` for services, **PowerShell only for AppX/DISM** (no Win32 equivalent for `Get-AppxPackage`) |
| Catalog  | **Declarative TOML** under `src-tauri/tweaks/`, embedded at compile time. Each tweak: `id`, `category`, `severity`, `presets[]`, `min_build/max_build`, `registry[]`, `services[]`, `appx[]`, `ps_apply`, `ps_revert`, `warning` |

Inspired by the data-driven approach of [ChrisTitusTech/winutil](https://github.com/ChrisTitusTech/winutil) and the cleanly separated regfiles of [Raphire/Win11Debloat](https://github.com/Raphire/Win11Debloat).

---

## Build from source

**Prerequisites**

- **Node 20+** and npm
- **Rust** (`rustup default stable`)
- **Visual Studio 2022 Build Tools** with the *Desktop development with C++* workload
- **WebView2 Runtime** (preinstalled on Windows 11)

**Build**

```powershell
# install JS deps
npm install

# dev (hot-reloads Svelte; restarts Rust on Cargo.toml change)
npm run tauri dev

# release build → src-tauri/target/release/bundle/{nsis,msi}/
npm run tauri build
```

---

## Project layout

```
win-tweak/
├── src/                           # Svelte 5 frontend
│   ├── app.css                    # Fluent design tokens (Mica-aware)
│   ├── lib/
│   │   ├── components/            # TitleBar, Sidebar, TweakCard, ApplyBar, …
│   │   ├── stores/tweaks.svelte.ts
│   │   └── types.ts
│   └── routes/+page.svelte
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json            # window: transparent + Mica
│   ├── capabilities/default.json
│   ├── tweaks/                    # declarative catalog (TOML + apps.json)
│   └── src/
│       ├── lib.rs                 # Tauri entry, plugin registration
│       ├── commands.rs            # invoke surface
│       ├── catalog.rs             # tweak schema + loader
│       ├── registry.rs            # winreg ops + snapshot/restore
│       ├── services.rs            # sc.exe wrapper
│       ├── appx.rs                # PowerShell appx remove/reinstall
│       ├── powershell.rs          # safe ps spawn
│       ├── system.rs              # version + restore points
│       ├── backup.rs              # per-tweak undo journal
│       └── error.rs
├── .github/workflows/             # CI build + tag-triggered release
├── LICENSE
└── README.md
```

---

## Adding a tweak

1. Open the matching file in `src-tauri/tweaks/` (or create `mything.toml` and add it to `TWEAK_FILES` in `catalog.rs`).
2. Append a TOML block:

   ```toml
   [[tweak]]
   id = "explorer.show-seconds-clock"
   name = "Show Seconds on Taskbar Clock"
   description = "Reveals seconds on the system clock."
   category = "explorer"
   severity = "safe"
   presets = ["recommended"]
   [[tweak.registry]]
   hive = "HKCU"
   path = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced"
   name = "ShowSecondsInSystemClock"
   kind = "dword"
   value = 1
   ```

3. Rebuild — the catalogue is embedded with `include_str!`.

---

## Releasing

Releases are produced by `.github/workflows/release.yml`, triggered by pushing a `v*.*.*` tag:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

The workflow builds NSIS + MSI installers on a Windows runner and uploads them to a **draft GitHub Release** — review the draft, edit notes, and publish from the Releases page when ready.

---

## Design system

Colors and tokens live in `src/app.css`:

- **Surfaces** are translucent so the **Mica** background shines through.
- **Accent**: Win11 dark accent `#60cdff`.
- **Severity**: Safe `#6ccb5f`, Caution `#fce100`, Risky `#ff99a4`.
- **Typography**: Segoe UI Variable (Win11 system font) → falls back to Inter.
- **Motion**: 100/200/350 ms with Fluent `cubic-bezier(0.10, 0.90, 0.20, 1.00)`.

Components follow Fluent rules: 1 px subtle strokes, 4/8/12 px radii, hover-only state on translucent overlays, an animated 16 px accent indicator on the active sidebar item, focus ring 2 px outside.

---

## Safety notes

- This tool only writes to **registry**, **services**, and **AppX**. It **never** disables Defender, SmartScreen, or update services — that is where other debloaters have caused real damage.
- The **Risky** badge requires explicit per-tweak opt-in (no preset enables them by default).
- All batch operations create a **system restore point** by default (toggle in the Apply bar).
- Use at your own risk. Take a restore point. Read what each tweak does before applying.

---

## Contributing

Issues and PRs welcome — especially:

- New tweaks (just a TOML block, see above)
- Build-version gating (`min_build` / `max_build`) for tweaks that only apply to specific Windows 11 feature updates
- Translations of tweak names/descriptions

Please run `npm run check` and `cargo fmt` before opening a PR.

---

## License

[MIT](LICENSE) © 2026 Jonas Laux
