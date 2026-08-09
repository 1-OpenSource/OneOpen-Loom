import type { ReactNode } from "react";
import WorkItemCard from "./WorkItemCard";
import type { WorkItemSummary } from "../../types/workItem";

export default function WorkItemStatusColumn({
  title,
  color,
  items,
  isActiveDropZone,
  headerAction,
  onDropItem,
  onDragStart
}: {
  title: string;
  color: string;
  items: WorkItemSummary[];
  isActiveDropZone?: boolean;
  headerAction?: ReactNode;
  onDropItem: () => void;
  onDragStart: (itemId: string) => void;
}) {
  return (
    <section
      className={`status-column ${isActiveDropZone ? "status-column-active" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropItem}
    >
      <header>
        <div className="status-column-heading">
          <span className="status-dot" style={{ backgroundColor: color }} />
          <h2>{title}</h2>
          <span>{items.length}</span>
        </div>
        {headerAction}
      </header>
      <div className="status-column-list">
        {items.map((item) => (
          <WorkItemCard key={item.id} item={item} draggable onDragStart={onDragStart} />
        ))}
      </div>
    </section>
  );
}
