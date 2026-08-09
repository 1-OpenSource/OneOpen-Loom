import { CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import PriorityBadge from "../ui/PriorityBadge";
import Badge from "../ui/Badge";
import type { WorkItemSummary } from "../../types/workItem";
import { formatDate } from "../../utils/formatDate";

export default function WorkItemCard({
  item,
  draggable = false,
  onDragStart
}: {
  item: WorkItemSummary;
  draggable?: boolean;
  onDragStart?: (itemId: string) => void;
}) {
  return (
    <article
      className="work-item-card"
      draggable={draggable}
      onDragStart={() => onDragStart?.(item.id)}
    >
      <div className="work-item-card-top">
        <Link to={`/work-items/${item.id}`} className="item-key">
          {item.work_item_key}
        </Link>
        <ChevronRight size={14} className="work-item-card-arrow" />
      </div>
      <Link to={`/work-items/${item.id}`} className="work-item-title-link">
        <h3>{item.title}</h3>
      </Link>
      <div className="inline-badges">
        <Badge tone="teal">{item.type.replaceAll("_", " ")}</Badge>
        <PriorityBadge priority={item.priority} />
        {item.is_blocked ? <Badge tone="red">Blocked</Badge> : null}
      </div>
      <div className="work-item-card-footer">
        <div className="work-item-card-meta">
          {item.story_points ? <span>{item.story_points} pts</span> : null}
          {item.due_date ? (
            <span>
              <CalendarDays size={12} />
              {formatDate(item.due_date)}
            </span>
          ) : null}
        </div>
        {item.assignee ? <Avatar user={item.assignee} size="sm" /> : <span className="avatar avatar-sm avatar-empty">-</span>}
      </div>
    </article>
  );
}
