import type { ReactNode } from "react";
import {
  AppWindow,
  FolderKanban,
  GitBranch,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Mail,
  Palette,
  Settings2,
  Shield,
  Store,
  Tags,
  UserRound,
  UsersRound
} from "lucide-react";

export type AdminSection =
  | "overview"
  | "users"
  | "groups"
  | "permissions"
  | "projects"
  | "issues"
  | "workflows"
  | "apps"
  | "marketplace"
  | "email"
  | "domains"
  | "branding"
  | "security"
  | "general";

export interface AdminSectionMeta {
  id: AdminSection;
  label: string;
  blurb: string;
  icon: ReactNode;
}

export const ADMIN_SECTIONS: AdminSectionMeta[] = [
  { id: "overview", label: "Overview", blurb: "Admin home", icon: <LayoutDashboard size={16} /> },
  { id: "users", label: "Users", blurb: "Members & invites", icon: <UserRound size={16} /> },
  { id: "groups", label: "Groups", blurb: "Team access", icon: <UsersRound size={16} /> },
  { id: "permissions", label: "Permissions", blurb: "Project schemes", icon: <Shield size={16} /> },
  { id: "projects", label: "Projects", blurb: "Workspace projects", icon: <FolderKanban size={16} /> },
  { id: "issues", label: "Issue types", blurb: "Type schemes", icon: <Tags size={16} /> },
  { id: "workflows", label: "Workflows", blurb: "Transitions & rules", icon: <GitBranch size={16} /> },
  { id: "apps", label: "Apps", blurb: "Plugins & Slack", icon: <AppWindow size={16} /> },
  { id: "marketplace", label: "Marketplace", blurb: "Install apps", icon: <Store size={16} /> },
  { id: "email", label: "Email", blurb: "SMTP & templates", icon: <Mail size={16} /> },
  { id: "domains", label: "Domains", blurb: "DNS & hosts", icon: <Globe2 size={16} /> },
  { id: "branding", label: "Branding", blurb: "Logo & colors", icon: <Palette size={16} /> },
  { id: "security", label: "Security", blurb: "SSO, tokens, GDPR", icon: <KeyRound size={16} /> },
  { id: "general", label: "General", blurb: "Workspace settings", icon: <Settings2 size={16} /> }
];

export function parseAdminSection(value: string | null): AdminSection {
  const match = ADMIN_SECTIONS.find((section) => section.id === value);
  return match?.id ?? "overview";
}
