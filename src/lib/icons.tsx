import * as Fi from '@fluentui/react-icons';
import type { FC } from 'react';

export type FluentIconName =
  | 'Activity' | 'AlertOctagon' | 'AlertTriangle' | 'AppWindow' | 'ArrowRight'
  | 'Bell' | 'Check' | 'CheckCircle2' | 'CheckSquare' | 'Code2'
  | 'CornerDownLeft' | 'Cpu' | 'Download' | 'ExternalLink' | 'Filter'
  | 'Flame' | 'FolderOpen' | 'Gamepad2' | 'Gauge' | 'Globe'
  | 'HardDrive' | 'History' | 'Inbox' | 'Info' | 'LayoutDashboard'
  | 'Lock' | 'MemoryStick' | 'Minus' | 'Monitor' | 'Moon'
  | 'Package' | 'PackagePlus' | 'Play' | 'Power' | 'RefreshCcw'
  | 'RefreshCw' | 'Search' | 'SearchCheck' | 'Server' | 'Settings'
  | 'Settings2' | 'ShieldAlert' | 'ShieldCheck' | 'ShieldOff' | 'Sparkles'
  | 'Square' | 'Sun' | 'ToggleRight' | 'Trash2' | 'Undo2'
  | 'Volume2' | 'Wifi' | 'X' | 'XCircle' | 'Zap'
  | 'Maximize' | 'WindowMultiple';

type IconComp = FC<{ className?: string; primaryFill?: string }>;

// Regular variants (outline). For "active/bold" we swap to the filled variant.
export const iconRegular: Record<FluentIconName, IconComp> = {
  Activity:        Fi.Pulse20Regular,
  AlertOctagon:    Fi.ErrorCircle20Regular,
  AlertTriangle:   Fi.Warning20Regular,
  AppWindow:       Fi.WindowApps20Regular,
  ArrowRight:      Fi.ArrowRight20Regular,
  Bell:            Fi.Alert20Regular,
  Check:           Fi.Checkmark20Regular,
  CheckCircle2:    Fi.CheckmarkCircle20Regular,
  CheckSquare:     Fi.CheckboxChecked20Regular,
  Code2:           Fi.Code20Regular,
  CornerDownLeft:  Fi.ArrowEnter20Regular,
  Cpu:             Fi.DeveloperBoard20Regular,
  Download:        Fi.ArrowDownload20Regular,
  ExternalLink:    Fi.Open20Regular,
  Filter:          Fi.Filter20Regular,
  Flame:           Fi.Flash20Regular,
  FolderOpen:      Fi.FolderOpen20Regular,
  Gamepad2:        Fi.Games20Regular,
  Gauge:           Fi.Gauge20Regular,
  Globe:           Fi.Globe20Regular,
  HardDrive:       Fi.HardDrive20Regular,
  History:         Fi.History20Regular,
  Inbox:           Fi.MailInbox20Regular,
  Info:            Fi.Info20Regular,
  LayoutDashboard: Fi.Board20Regular,
  Lock:            Fi.LockClosed20Regular,
  MemoryStick:     Fi.Ram20Regular,
  Minus:           Fi.Subtract20Regular,
  Monitor:         Fi.Desktop20Regular,
  Moon:            Fi.WeatherMoon20Regular,
  Package:         Fi.Box20Regular,
  PackagePlus:     Fi.BoxEdit20Regular,
  Play:            Fi.Play20Regular,
  Power:           Fi.Power20Regular,
  RefreshCcw:      Fi.ArrowCounterclockwise20Regular,
  RefreshCw:       Fi.ArrowClockwise20Regular,
  Search:          Fi.Search20Regular,
  SearchCheck:     Fi.SearchInfo20Regular,
  Server:          Fi.Server20Regular,
  Settings:        Fi.Settings20Regular,
  Settings2:       Fi.Options20Regular,
  ShieldAlert:     Fi.ShieldError20Regular,
  ShieldCheck:     Fi.ShieldCheckmark20Regular,
  ShieldOff:       Fi.ShieldDismiss20Regular,
  Sparkles:        Fi.Sparkle20Regular,
  Square:          Fi.CheckboxUnchecked20Regular,
  Sun:             Fi.WeatherSunny20Regular,
  ToggleRight:     Fi.ToggleRight20Regular,
  Trash2:          Fi.Delete20Regular,
  Undo2:           Fi.ArrowUndo20Regular,
  Volume2:         Fi.Speaker220Regular,
  Wifi:            Fi.Wifi120Regular,
  X:               Fi.Dismiss20Regular,
  XCircle:         Fi.DismissCircle20Regular,
  Zap:             Fi.Flash20Regular,
  Maximize:        Fi.Maximize20Regular,
  WindowMultiple:  Fi.SquareMultiple20Regular
};

export const iconFilled: Partial<Record<FluentIconName, IconComp>> = {
  Activity:        Fi.Pulse20Filled,
  AlertTriangle:   Fi.Warning20Filled,
  AppWindow:       Fi.WindowApps20Filled,
  Bell:            Fi.Alert20Filled,
  Check:           Fi.Checkmark20Filled,
  CheckCircle2:    Fi.CheckmarkCircle20Filled,
  Code2:           Fi.Code20Filled,
  Cpu:             Fi.DeveloperBoard20Filled,
  Filter:          Fi.Filter20Filled,
  FolderOpen:      Fi.FolderOpen20Filled,
  Gamepad2:        Fi.Games20Filled,
  Gauge:           Fi.Gauge20Filled,
  Globe:           Fi.Globe20Filled,
  HardDrive:       Fi.HardDrive20Filled,
  History:         Fi.History20Filled,
  LayoutDashboard: Fi.Board20Filled,
  Lock:            Fi.LockClosed20Filled,
  Monitor:         Fi.Desktop20Filled,
  Moon:            Fi.WeatherMoon20Filled,
  Package:         Fi.Box20Filled,
  Power:           Fi.Power20Filled,
  RefreshCcw:      Fi.ArrowCounterclockwise20Filled,
  RefreshCw:       Fi.ArrowClockwise20Filled,
  Search:          Fi.Search20Filled,
  Settings:        Fi.Settings20Filled,
  Settings2:       Fi.Options20Filled,
  ShieldCheck:     Fi.ShieldCheckmark20Filled,
  ShieldOff:       Fi.ShieldDismiss20Filled,
  Sparkles:        Fi.Sparkle20Filled,
  Sun:             Fi.WeatherSunny20Filled,
  Trash2:          Fi.Delete20Filled,
  Volume2:         Fi.Speaker220Filled,
  Wifi:            Fi.Wifi120Filled,
  Zap:             Fi.Flash20Filled
};
