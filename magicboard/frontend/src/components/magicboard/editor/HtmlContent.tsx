import { useEffect, useMemo, useState, type ReactNode } from "react";
import { looksLikeHtml } from "./contentDetect";
import { legacyMarkdownToHtml } from "./legacyMarkdown";
import { sanitizeHtml } from "./sanitize";
import AttachmentImg from "./AttachmentImg";
import MarkdownWithMacros from "../MarkdownWithMacros";
import { magicboardService } from "../../../services/magicboardService";
import type { PageWorkItemSummary, SpacePage } from "../../../types/magicboard";

const workboardAppUrl = (import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim();

function extractToc(html: string): Array<{ id: string; text: string; level: number }> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((heading, index) => {
    const text = heading.textContent?.trim() || `Heading ${index + 1}`;
    const id =
      heading.id ||
      text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-") ||
      `heading-${index}`;
    return { id, text, level: Number(heading.tagName.slice(1)) };
  });
}

function WorkItemLiveCard({
  workspaceId,
  workItemKey,
  cached
}: {
  workspaceId: string;
  workItemKey: string;
  cached: Partial<PageWorkItemSummary> & { priority?: string };
}) {
  const [item, setItem] = useState<PageWorkItemSummary | null>(
    cached.title
      ? {
          id: cached.id || "",
          work_item_key: workItemKey,
          title: cached.title,
          status: cached.status || "",
          type: cached.type || "",
          project_id: ""
        }
      : null
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await magicboardService.getWorkItemByKey(workspaceId, workItemKey);
      if (!cancelled && result) setItem(result);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workItemKey]);

  if (!item) {
    return <div className="macro-workitem-card macro-workitem-loading">Loading {workItemKey}…</div>;
  }
  const href = workboardAppUrl && item.id
    ? `${workboardAppUrl.replace(/\/$/, "")}/work-items/${item.id}`
    : undefined;
  const body = (
    <>
      <span className="item-key">{item.work_item_key}</span>
      <strong>{item.title}</strong>
      <div className="inline-badges">
        {item.status ? <span className="mb-status-chip">{item.status.replaceAll("_", " ")}</span> : null}
        <span className="muted-copy">{item.type.replaceAll("_", " ")}</span>
        {cached.priority ? <span className="muted-copy">{cached.priority}</span> : null}
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

function IncludeLive({ spaceId, slug }: { spaceId: string; slug: string }) {
  const [page, setPage] = useState<SpacePage | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pages = await magicboardService.listPagesFlat(spaceId);
      if (!cancelled) setPage(pages.find((candidate) => candidate.slug === slug) ?? null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [spaceId, slug]);
  if (!page) return <div className="macro-callout">Loading include…</div>;
  return (
    <div className="macro-include">
      <div className="macro-include-header">{page.title}</div>
      <HtmlContent text={page.content ?? ""} workspaceId="" spaceId={spaceId} />
    </div>
  );
}

function EnhancedHtml({
  html,
  workspaceId,
  spaceId
}: {
  html: string;
  workspaceId: string;
  spaceId: string;
}) {
  const toc = useMemo(() => extractToc(html), [html]);
  const parts = useMemo(() => {
    const doc = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
    doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading, index) => {
      if (!heading.id) {
        const text = heading.textContent?.trim() || `heading-${index}`;
        heading.id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }
    });
    return Array.from(doc.body.childNodes);
  }, [html]);

  return (
    <div className="mb-html-content">
      {parts.map((node, index) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return null;
        }
        const el = node as HTMLElement;
        if (el.hasAttribute("data-mb-toc")) {
          return (
            <nav key={`toc-${index}`} className="macro-toc" aria-label="Table of contents">
              <strong>On this page</strong>
              <ul>
                {toc.map((heading) => (
                  <li key={heading.id} style={{ marginLeft: `${(heading.level - 1) * 12}px` }}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ul>
            </nav>
          );
        }
        if (el.hasAttribute("data-mb-workitem")) {
          const key = el.getAttribute("data-mb-workitem") || "";
          return (
            <WorkItemLiveCard
              key={`wi-${index}`}
              workspaceId={workspaceId}
              workItemKey={key}
              cached={{
                id: el.getAttribute("data-mb-workitem-id") || "",
                title: el.getAttribute("data-mb-workitem-title") || undefined,
                status: el.getAttribute("data-mb-workitem-status") || undefined,
                type: el.getAttribute("data-mb-workitem-type") || undefined,
                priority: el.getAttribute("data-mb-workitem-priority") || undefined
              }}
            />
          );
        }
        if (el.hasAttribute("data-mb-include")) {
          return (
            <IncludeLive key={`inc-${index}`} spaceId={spaceId} slug={el.getAttribute("data-mb-include") || ""} />
          );
        }
        if (el.tagName === "IMG") {
          return (
            <AttachmentImg
              key={`img-${index}`}
              src={el.getAttribute("src") || ""}
              alt={el.getAttribute("alt") || "image"}
            />
          );
        }
        const images = Array.from(el.querySelectorAll("img"));
        if (images.some((img) => (img.getAttribute("src") || "").startsWith("attachment:"))) {
          const clone = el.cloneNode(true) as HTMLElement;
          const slots: ReactNode[] = [];
          Array.from(clone.querySelectorAll("img")).forEach((img, imgIndex) => {
            const placeholder = document.createElement("span");
            placeholder.setAttribute("data-mb-img-slot", String(imgIndex));
            img.replaceWith(placeholder);
            slots.push(
              <AttachmentImg
                key={`slot-${index}-${imgIndex}`}
                src={img.getAttribute("src") || ""}
                alt={img.getAttribute("alt") || "image"}
              />
            );
          });
          const html = sanitizeHtml(clone.outerHTML);
          const pieces = html.split(/<span[^>]*data-mb-img-slot="(\d+)"[^>]*><\/span>/g);
          const rendered: ReactNode[] = [];
          for (let i = 0; i < pieces.length; i += 1) {
            if (i % 2 === 0) {
              if (pieces[i]) {
                rendered.push(
                  <span key={`chunk-${index}-${i}`} dangerouslySetInnerHTML={{ __html: pieces[i] }} />
                );
              }
            } else {
              const slotIndex = Number(pieces[i]);
              rendered.push(slots[slotIndex]);
            }
          }
          return <div key={`html-${index}`}>{rendered}</div>;
        }
        return (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(el.outerHTML) }}
          />
        );
      })}
    </div>
  );
}

export default function HtmlContent({
  text,
  workspaceId,
  spaceId
}: {
  text: string;
  workspaceId: string;
  spaceId: string;
}) {
  if (!text.trim()) return null;
  if (!looksLikeHtml(text)) {
    return <MarkdownWithMacros text={text} workspaceId={workspaceId} spaceId={spaceId} />;
  }
  const html = looksLikeHtml(text) ? text : legacyMarkdownToHtml(text);
  return <EnhancedHtml html={html} workspaceId={workspaceId} spaceId={spaceId} />;
}
