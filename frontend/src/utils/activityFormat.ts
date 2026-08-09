import type { Activity } from "../types/activity";
import { parseDate } from "./parseDate";

const ACTION_LABELS: Record<string, string> = {
  "work_item.created": "created a work item",
  "work_item.updated": "updated a work item",
  "work_item.deleted": "deleted a work item",
  "work_item.link_created": "linked a work item",
  "work_item.link_deleted": "removed a work item link",
  "comment.created": "added a comment",
  "comment.updated": "edited a comment",
  "comment.deleted": "removed a comment",
  "attachment.uploaded": "uploaded an attachment",
  "attachment.deleted": "removed an attachment",
  "project.created": "created a project",
  "project.updated": "updated a project",
  "project.archived": "archived a project",
  "project.restored": "restored a project",
  "project.deleted": "deleted a project",
  "project.member_added": "added a project member",
  "project.member_role_updated": "changed a project member role",
  "project.member_removed": "removed a project member",
  "workspace.created": "created a workspace",
  "workspace.updated": "updated a workspace",
  "workspace.member_added": "added a workspace member",
  "workspace.member_role_updated": "changed a workspace member role",
  "workspace.member_removed": "removed a workspace member",
  "workspace.invitation_created": "sent a workspace invitation",
  "workspace.invitation_accepted": "accepted a workspace invitation"
};

export function formatActivityAction(action: string): string {
  if (ACTION_LABELS[action]) {
    return ACTION_LABELS[action];
  }
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

export function formatFieldLabel(fieldName: string | null): string | null {
  if (!fieldName) {
    return null;
  }
  return fieldName.replaceAll("_", " ");
}

export function formatRelativeTime(value: string): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const diffMs = date.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(Math.round(diffMs / 1000), "second");
  }
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return formatter.format(Math.round(diffMs / (60 * 1000)), "minute");
  }
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }
  const absDays = Math.round(absHours / 24);
  if (absDays < 30) {
    return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
  }
  const absMonths = Math.round(absDays / 30);
  if (absMonths < 12) {
    return formatter.format(Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)), "month");
  }
  return formatter.format(Math.round(diffMs / (365 * 24 * 60 * 60 * 1000)), "year");
}

export function getActivityTone(entry: Activity): "create" | "update" | "delete" | "comment" | "member" | "default" {
  const action = entry.action.toLowerCase();
  if (action.includes("comment")) return "comment";
  if (action.includes("member") || action.includes("invitation")) return "member";
  if (action.includes("deleted") || action.includes("removed") || action.includes("archived")) return "delete";
  if (action.includes("created") || action.includes("uploaded") || action.includes("restored")) return "create";
  if (action.includes("updated") || action.includes("link")) return "update";
  return "default";
}
