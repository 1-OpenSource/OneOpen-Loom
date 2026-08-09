import { useEffect, useMemo, useState, type ReactNode } from "react";
import Badge from "../ui/Badge";
import MarkdownContent from "../ui/MarkdownContent";
import { magicboardService } from "../../services/magicboardService";
import type { PageWorkItemSummary, SpacePage } from "../../types/magicboard";

const MACRO_PATTERN = /\{\{([^}]+)\}\}/g;

interface Heading {
  level: number;
  text: string;
  id: string;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of source.replaceAll("\r\n", "\n").split("\n")) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const text = match[2].trim();
    headings.push({
      level: match[1].length,
      text,
      id: slugifyHeading(text)
    });
  }
  return headings;
}

function TableOfContents({ headings }: { headings: Heading[] }) {
  if (!headings.length) {
    return <p className="muted-copy">No headings found.</p>;
  }
  return (
    <nav className="macro-toc" aria-label="Table of contents">
      <strong>On this page</strong>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id} style={{ marginLeft: `${(heading.level - 1) * 12}px` }}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const workboardAppUrl = (import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim();

function WorkItemMacroCard({ item }: { item: PageWorkItemSummary }) {
  const href = workboardAppUrl ? `${workboardAppUrl.replace(/\/$/, "")}/work-items/${item.id}` : undefined;
  const body = (
    <>
      <span className="item-key">{item.work_item_key}</span>
      <strong>{item.title}</strong>
      <div className="inline-badges">
        <Badge tone="teal">{item.status.replaceAll("_", " ")}</Badge>
        <span className="muted-copy">{item.type.replaceAll("_", " ")}</span>
      </div>
    </>
  );
  if (href) {
    return (
      <a href={href} className="macro-workitem-card">
        {body}
      </a>
    );
  }
  return <div className="macro-workitem-card">{body}</div>;
}

function WorkItemMacro({ workspaceId, workItemKey }: { workspaceId: string; workItemKey: string }) {
  const [item, setItem] = useState<PageWorkItemSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await magicboardService.getWorkItemByKey(workspaceId, workItemKey);
      if (!cancelled) {
        setItem(result);
        setFailed(!result);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workItemKey]);

  if (failed) {
    return (
      <div className="macro-workitem-card macro-workitem-missing">
        {workboardAppUrl
          ? `Work item ${workItemKey} not found`
          : `Workboard not connected — cannot resolve ${workItemKey}`}
      </div>
    );
  }
  if (!item) {
    return <div className="macro-workitem-card macro-workitem-loading">Loading {workItemKey}…</div>;
  }
  return <WorkItemMacroCard item={item} />;
}

function IncludeMacro({ spaceId, slug }: { spaceId: string; slug: string }) {
  const [page, setPage] = useState<SpacePage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pages = await magicboardService.listPagesFlat(spaceId);
      const match = pages.find((candidate) => candidate.slug === slug);
      if (!cancelled) {
        setPage(match ?? null);
        setFailed(!match);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [spaceId, slug]);

  if (failed) {
    return <div className="macro-callout">Included page “{slug}” not found.</div>;
  }
  if (!page) {
    return <div className="macro-callout">Loading include…</div>;
  }
  return (
    <div className="macro-include">
      <div className="macro-include-header">{page.title}</div>
      <MarkdownWithMacros text={page.content ?? ""} workspaceId="" spaceId={spaceId} />
    </div>
  );
}

function renderMacro(
  raw: string,
  workspaceId: string,
  spaceId: string,
  fullSource: string
): ReactNode {
  const trimmed = raw.trim();
  if (trimmed === "toc") {
    return <TableOfContents headings={extractHeadings(fullSource)} />;
  }
  if (trimmed.startsWith("workitem:")) {
    const key = trimmed.slice("workitem:".length).trim();
    if (!workspaceId || !key) {
      return <div className="macro-workitem-card macro-workitem-missing">Invalid work item macro</div>;
    }
    return <WorkItemMacro workspaceId={workspaceId} workItemKey={key} />;
  }
  if (trimmed.startsWith("info:")) {
    const text = trimmed.slice("info:".length).trim();
    return <div className="macro-callout">{text || "Info"}</div>;
  }
  if (trimmed.startsWith("include:")) {
    const slug = trimmed.slice("include:".length).trim();
    if (!spaceId || !slug) {
      return <div className="macro-callout">Invalid include macro</div>;
    }
    return <IncludeMacro spaceId={spaceId} slug={slug} />;
  }
  return <code>{`{{${raw}}}`}</code>;
}

export default function MarkdownWithMacros({
  text,
  workspaceId,
  spaceId
}: {
  text: string;
  workspaceId: string;
  spaceId: string;
}) {
  const segments = useMemo(() => {
    const parts: Array<{ type: "text" | "macro"; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const pattern = new RegExp(MACRO_PATTERN.source, "g");
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "macro", value: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }
    return parts;
  }, [text]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div className="markdown-with-macros">
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <MarkdownContent key={`text-${index}`} text={segment.value} />
        ) : (
          <div key={`macro-${index}`} className="macro-block">
            {renderMacro(segment.value, workspaceId, spaceId, text)}
          </div>
        )
      )}
    </div>
  );
}
