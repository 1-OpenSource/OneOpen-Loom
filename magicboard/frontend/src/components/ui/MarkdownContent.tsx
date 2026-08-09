import { useEffect, useState, type ReactNode } from "react";
import { magicboardService } from "../../services/magicboardService";
import { parseMarkdown, type BlockNode, type InlineNode } from "../../utils/markdown";

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isAttachmentUrl(url: string): boolean {
  return /^attachment:[0-9a-f-]{36}$/i.test(url);
}

function AttachmentImage({ attachmentId, alt }: { attachmentId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      try {
        const response = await magicboardService.getAttachmentBlob(attachmentId);
        objectUrl = window.URL.createObjectURL(response);
        if (!cancelled) {
          setSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachmentId]);

  if (!src) {
    return <span className="md-image-fallback">{alt || "Image"}</span>;
  }

  return <img className="md-image" src={src} alt={alt} loading="lazy" />;
}

function renderInlines(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return <span key={key}>{node.value}</span>;
      case "strong":
        return <strong key={key}>{renderInlines(node.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInlines(node.children, key)}</em>;
      case "strike":
        return <s key={key}>{renderInlines(node.children, key)}</s>;
      case "code":
        return (
          <code key={key} className="md-code">
            {node.value}
          </code>
        );
      case "link":
        if (!isSafeHttpUrl(node.href) && !isAttachmentUrl(node.href)) {
          return <span key={key}>{renderInlines(node.children, key)}</span>;
        }
        if (isAttachmentUrl(node.href)) {
          const attachmentId = node.href.slice("attachment:".length);
          return (
            <button
              key={key}
              type="button"
              className="md-attachment-link"
              onClick={() => void magicboardService.downloadAttachment(attachmentId, node.children[0]?.type === "text" ? node.children[0].value : "attachment")}
            >
              {renderInlines(node.children, key)}
            </button>
          );
        }
        return (
          <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInlines(node.children, key)}
          </a>
        );
      case "image":
        if (isAttachmentUrl(node.src)) {
          return <AttachmentImage key={key} attachmentId={node.src.slice("attachment:".length)} alt={node.alt} />;
        }
        if (!isSafeHttpUrl(node.src)) {
          return (
            <span key={key} className="md-image-fallback">
              {node.alt || "Image"}
            </span>
          );
        }
        return <img key={key} className="md-image" src={node.src} alt={node.alt} loading="lazy" />;
      default:
        return null;
    }
  });
}

function renderBlocks(blocks: BlockNode[]): ReactNode[] {
  return blocks.map((block, index) => {
    const key = `block-${index}`;
    switch (block.type) {
      case "heading": {
        const HeadingTag = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return (
          <HeadingTag key={key} className={`md-heading md-heading-${block.level}`}>
            {renderInlines(block.children, key)}
          </HeadingTag>
        );
      }
      case "paragraph":
        return (
          <p key={key} className="md-paragraph">
            {renderInlines(block.children, key)}
          </p>
        );
      case "quote":
        return (
          <blockquote key={key} className="md-quote">
            {renderInlines(block.children, key)}
          </blockquote>
        );
      case "list": {
        const ListTag = block.ordered ? "ol" : "ul";
        return (
          <ListTag key={key} className="md-list">
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-${itemIndex}`}>{renderInlines(item, `${key}-${itemIndex}`)}</li>
            ))}
          </ListTag>
        );
      }
      default:
        return null;
    }
  });
}

export default function MarkdownContent({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  if (!blocks.length) {
    return null;
  }
  return <div className="markdown-content">{renderBlocks(blocks)}</div>;
}
