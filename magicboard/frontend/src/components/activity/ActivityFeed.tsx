import {
  Archive,
  Link2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  UserPlus
} from "lucide-react";
import type { ReactNode } from "react";
import type { Activity } from "../../types/activity";
import {
  formatActivityAction,
  formatFieldLabel,
  formatRelativeTime,
  getActivityTone
} from "../../utils/activityFormat";
import { formatDateTime } from "../../utils/formatDate";
import Avatar from "../ui/Avatar";
import EmptyState from "../ui/EmptyState";

interface ActivityFeedProps {
  entries: Activity[];
  emptyTitle?: string;
  emptyDescription?: string;
  limit?: number;
}

function ActivityIcon({ entry }: { entry: Activity }) {
  const action = entry.action.toLowerCase();
  let icon: ReactNode = <Pencil size={14} />;

  if (action.includes("comment")) icon = <MessageSquare size={14} />;
  else if (action.includes("attachment")) icon = <Paperclip size={14} />;
  else if (action.includes("link")) icon = <Link2 size={14} />;
  else if (action.includes("member") || action.includes("invitation")) icon = <UserPlus size={14} />;
  else if (action.includes("archived")) icon = <Archive size={14} />;
  else if (action.includes("deleted") || action.includes("removed")) icon = <Trash2 size={14} />;
  else if (action.includes("created") || action.includes("uploaded") || action.includes("restored")) icon = <Plus size={14} />;

  return <span className={`activity-marker activity-marker-${getActivityTone(entry)}`}>{icon}</span>;
}

export default function ActivityFeed({
  entries,
  emptyTitle = "No activity yet",
  emptyDescription = "History will appear here as people make changes.",
  limit
}: ActivityFeedProps) {
  const items = typeof limit === "number" ? entries.slice(0, limit) : entries;

  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol className="activity-feed">
      {items.map((entry) => {
        const fieldLabel = formatFieldLabel(entry.field_name);
        const actorName = entry.actor?.name ?? "Someone";

        return (
          <li className="activity-item" key={entry.id}>
            <div className="activity-rail" aria-hidden="true">
              <ActivityIcon entry={entry} />
            </div>

            <div className="activity-body">
              <div className="activity-header">
                <div className="activity-actor">
                  <Avatar user={entry.actor} size="sm" />
                  <div className="activity-copy">
                    <p className="activity-summary">
                      <strong>{actorName}</strong> {formatActivityAction(entry.action)}
                      {entry.entity_label ? <span className="activity-entity">{entry.entity_label}</span> : null}
                    </p>
                    {fieldLabel || entry.old_value || entry.new_value ? (
                      <div className="activity-change">
                        {fieldLabel ? <span className="activity-field">{fieldLabel}</span> : null}
                        {entry.old_value || entry.new_value ? (
                          <span className="activity-values">
                            <span className="activity-old">{entry.old_value || "—"}</span>
                            <span className="activity-arrow" aria-hidden="true">
                              →
                            </span>
                            <span className="activity-new">{entry.new_value || "—"}</span>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <time className="activity-time" dateTime={entry.created_at} title={formatDateTime(entry.created_at)}>
                  {formatRelativeTime(entry.created_at)}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
