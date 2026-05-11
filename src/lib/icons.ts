// Lucide → Fluent UI System Icons mapping (regular / outline variant only).
// Active states use CSS-based stroke thickening (see Icon.svelte `bold` prop)
// to avoid layout shift from switching between regular/filled glyphs.

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
  | 'Volume2' | 'Wifi' | 'X' | 'XCircle' | 'Zap';

const fi = (slug: string) => `fluent:${slug}-20-regular`;

export const iconMap: Record<FluentIconName, string> = {
  Activity:        fi('pulse'),
  AlertOctagon:    fi('error-circle'),
  AlertTriangle:   fi('warning'),
  AppWindow:       fi('window-apps'),
  ArrowRight:      fi('arrow-right'),
  Bell:            fi('alert'),
  Check:           fi('checkmark'),
  CheckCircle2:    fi('checkmark-circle'),
  CheckSquare:     fi('checkbox-checked'),
  Code2:           fi('code'),
  CornerDownLeft:  fi('arrow-enter'),
  Cpu:             fi('developer-board'),
  Download:        fi('arrow-download'),
  ExternalLink:    fi('open'),
  Filter:          fi('filter'),
  Flame:           fi('flash'),
  FolderOpen:      fi('folder-open'),
  Gamepad2:        fi('games'),
  Gauge:           fi('gauge'),
  Globe:           fi('globe'),
  HardDrive:       fi('hard-drive'),
  History:         fi('history'),
  Inbox:           fi('mail-inbox'),
  Info:            fi('info'),
  LayoutDashboard: fi('board'),
  Lock:            fi('lock-closed'),
  MemoryStick:     fi('ram'),
  Minus:           fi('subtract'),
  Monitor:         fi('desktop'),
  Moon:            fi('weather-moon'),
  Package:         fi('box'),
  PackagePlus:     fi('box-edit'),
  Play:            fi('play'),
  Power:           fi('power'),
  RefreshCcw:      fi('arrow-counterclockwise'),
  RefreshCw:       fi('arrow-clockwise'),
  Search:          fi('search'),
  SearchCheck:     fi('search-info'),
  Server:          fi('server'),
  Settings:        fi('settings'),
  Settings2:       fi('options'),
  ShieldAlert:     fi('shield-error'),
  ShieldCheck:     fi('shield-checkmark'),
  ShieldOff:       fi('shield-dismiss'),
  Sparkles:        fi('sparkle'),
  Square:          fi('checkbox-unchecked'),
  Sun:             fi('weather-sunny'),
  ToggleRight:     fi('toggle-right'),
  Trash2:          fi('delete'),
  Undo2:           fi('arrow-undo'),
  Volume2:         fi('speaker-2'),
  Wifi:            fi('wifi-1'),
  X:               fi('dismiss'),
  XCircle:         fi('dismiss-circle'),
  Zap:             fi('flash'),
};
