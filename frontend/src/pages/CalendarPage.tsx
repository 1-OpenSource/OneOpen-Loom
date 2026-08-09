import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { workItemService } from "../services/workItemService";
import type { WorkItemSummary } from "../types/workItem";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export default function CalendarPage() {
  const { projectId = "" } = useParams();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: itemsPage } = useApi(
    () => workItemService.listWorkItems(projectId, { page_size: 100 }),
    [projectId]
  );
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const itemsWithDueDate = useMemo(
    () => (itemsPage?.items ?? []).filter((item): item is WorkItemSummary & { due_date: string } => Boolean(item.due_date)),
    [itemsPage]
  );

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function itemsForDay(day: Date) {
    return itemsWithDueDate.filter((item) => isSameDay(new Date(item.due_date), day));
  }

  const today = new Date();

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Calendar"}
        title={project ? `${project.name} calendar` : "Calendar"}
        description="Month view of upcoming due dates."
        actions={
          <div className="button-row">
            <Button
              variant="secondary"
              icon={<ChevronLeft size={16} />}
              onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="Previous month"
            />
            <strong className="calendar-month-label">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </strong>
            <Button
              variant="secondary"
              icon={<ChevronRight size={16} />}
              onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="Next month"
            />
          </div>
        }
      />

      <Card className="calendar-card">
        <div className="calendar-grid calendar-grid-header">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {monthDays.map((day, index) => (
            <div
              key={day ? day.toISOString() : `empty-${index}`}
              className={`calendar-cell ${day && isSameDay(day, today) ? "calendar-cell-today" : ""} ${
                !day ? "calendar-cell-empty" : ""
              }`}
            >
              {day ? (
                <>
                  <span className="calendar-cell-date">{day.getDate()}</span>
                  <div className="calendar-cell-items">
                    {itemsForDay(day)
                      .slice(0, 3)
                      .map((item) => (
                        <Link key={item.id} to={`/work-items/${item.id}`} className="calendar-item">
                          <Badge tone="teal">{item.work_item_key}</Badge>
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    {itemsForDay(day).length > 3 ? (
                      <span className="muted-copy">+{itemsForDay(day).length - 3} more</span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
