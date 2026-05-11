//! Hardware inventory via WMI. Not perf-critical so PowerShell is fine.

use crate::error::AppResult;
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct HardwareInfo {
    pub cpu: Option<CpuInfo>,
    pub gpus: Vec<GpuInfo>,
    pub memory: MemoryInfo,
    pub motherboard: Option<MotherboardInfo>,
    pub disks: Vec<DiskInfo>,
    pub bios: Option<BiosInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuInfo {
    pub name: String,
    pub manufacturer: String,
    pub cores: u32,
    pub threads: u32,
    pub max_clock_mhz: u32,
    pub socket: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuInfo {
    pub name: String,
    pub driver_version: String,
    pub driver_date: String,
    pub vram_gb: f64,
    pub vendor: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MemoryInfo {
    pub total_gb: f64,
    pub modules: Vec<MemoryModule>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryModule {
    pub capacity_gb: f64,
    pub speed_mhz: u32,
    pub manufacturer: String,
    pub bank: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MotherboardInfo {
    pub manufacturer: String,
    pub product: String,
    pub serial: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskInfo {
    pub model: String,
    pub size_gb: f64,
    pub media_type: String,
    pub interface: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BiosInfo {
    pub vendor: String,
    pub version: String,
    pub release_date: String,
}

pub fn info() -> AppResult<HardwareInfo> {
    let script = r#"
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpus = Get-CimInstance Win32_VideoController
$ram = Get-CimInstance Win32_PhysicalMemory
$mb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
$bios = Get-CimInstance Win32_BIOS | Select-Object -First 1
$disks = Get-PhysicalDisk -ErrorAction SilentlyContinue

$totalRamGb = if ($ram) { ($ram | Measure-Object -Property Capacity -Sum).Sum / 1GB } else { 0 }

$result = [PSCustomObject]@{
    cpu = if ($cpu) { @{
        name = $cpu.Name.Trim()
        manufacturer = $cpu.Manufacturer
        cores = [int]$cpu.NumberOfCores
        threads = [int]$cpu.NumberOfLogicalProcessors
        max_clock_mhz = [int]$cpu.MaxClockSpeed
        socket = $cpu.SocketDesignation
    } } else { $null }

    gpus = @($gpus | ForEach-Object {
        $vendor = if ($_.Name -match 'NVIDIA') { 'NVIDIA' }
                  elseif ($_.Name -match 'AMD|Radeon') { 'AMD' }
                  elseif ($_.Name -match 'Intel') { 'Intel' }
                  else { 'Other' }
        @{
            name = $_.Name
            driver_version = $_.DriverVersion
            driver_date = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { '' }
            vram_gb = [math]::Round([uint32]$_.AdapterRAM / 1GB, 2)
            vendor = $vendor
        }
    })

    memory = @{
        total_gb = [math]::Round($totalRamGb, 2)
        modules = @($ram | ForEach-Object {
            @{
                capacity_gb = [math]::Round($_.Capacity / 1GB, 2)
                speed_mhz = [int]$_.ConfiguredClockSpeed
                manufacturer = if ($_.Manufacturer) { $_.Manufacturer.Trim() } else { '' }
                bank = if ($_.BankLabel) { $_.BankLabel } else { $_.DeviceLocator }
            }
        })
    }

    motherboard = if ($mb) { @{
        manufacturer = $mb.Manufacturer
        product = $mb.Product
        serial = $mb.SerialNumber
    } } else { $null }

    disks = @($disks | ForEach-Object {
        @{
            model = $_.FriendlyName
            size_gb = [math]::Round($_.Size / 1GB, 2)
            media_type = "$($_.MediaType)"
            interface = "$($_.BusType)"
        }
    })

    bios = if ($bios) { @{
        vendor = $bios.Manufacturer
        version = $bios.SMBIOSBIOSVersion
        release_date = if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString('yyyy-MM-dd') } else { '' }
    } } else { $null }
}

$result | ConvertTo-Json -Depth 6 -Compress
"#;
    let out = powershell::run(script)?;
    let info: HardwareInfo = serde_json::from_str(out.trim())?;
    Ok(info)
}
