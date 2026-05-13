export type Severity = 'safe' | 'caution' | 'risky';

export type Category =
  | 'privacy'
  | 'bloatware'
  | 'performance'
  | 'explorer'
  | 'services'
  | 'ai'
  | 'gaming'
  | 'search'
  | 'updates'
  | 'group-policy'
  | 'network'
  | 'power'
  | 'edge'
  | 'annoyances'
  | 'developer'
  | 'audio'
  | 'security';

export interface Tweak {
  id: string;
  name: string;
  description: string;
  category: Category;
  severity: Severity;
  presets: string[];
  min_build?: number | null;
  max_build?: number | null;
  registry: unknown[];
  services: { name: string; startup: string; stop?: boolean }[];
  appx: { package: string }[];
  ps_apply?: string | null;
  ps_revert?: string | null;
  warning?: string | null;
}

export interface SystemInfo {
  os_name: string;
  edition: string;
  version: string;
  build: number;
  is_admin: boolean;
}

export interface WingetApp {
  id: string;
  name: string;
  category: string;
  description: string;
  homepage?: string | null;
}

export type DetectionState = 'applied' | 'not_applied' | 'modified' | 'unknown';

export interface TweakStatus {
  id: string;
  state: DetectionState;
  ops_total: number;
  ops_matching: number;
}

export interface DriftEntry {
  id: string;
  name: string;
  applied_at: number;
  state: DetectionState;
}

export interface Profile {
  id: string;
  name: string;
  icon: string;
  description: string;
  tweak_ids: string[];
}

export interface ConfigExport {
  version: number;
  exported_at: number;
  label: string | null;
  applied: string[];
}

export type DiffOp =
  | {
      kind: 'registry';
      tweak_id: string;
      tweak_name: string;
      path: string;
      name: string;
      current: unknown;
      desired: unknown;
      will_change: boolean;
    }
  | {
      kind: 'service';
      tweak_id: string;
      tweak_name: string;
      service: string;
      current: string | null;
      desired: string;
      will_change: boolean;
    }
  | {
      kind: 'appx';
      tweak_id: string;
      tweak_name: string;
      package: string;
      currently_installed: boolean;
      will_change: boolean;
    }
  | {
      kind: 'powershell';
      tweak_id: string;
      tweak_name: string;
      snippet: string;
    };

export type ViewKey =
  | 'dashboard'
  | 'profiles'
  | 'privacy'
  | 'bloatware'
  | 'ai'
  | 'explorer'
  | 'search'
  | 'performance'
  | 'gaming'
  | 'services'
  | 'apps'
  | 'startup'
  | 'hardware'
  | 'drivers'
  | 'updates'
  | 'group-policy'
  | 'network'
  | 'power'
  | 'edge'
  | 'annoyances'
  | 'developer'
  | 'audio'
  | 'security'
  | 'activity'
  | 'settings';
