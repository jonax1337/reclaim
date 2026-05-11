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

export type ViewKey =
  | 'dashboard'
  | 'privacy'
  | 'bloatware'
  | 'ai'
  | 'explorer'
  | 'search'
  | 'performance'
  | 'gaming'
  | 'services'
  | 'apps'
  | 'app-manager'
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
