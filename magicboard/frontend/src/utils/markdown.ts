export type MarkdownFormat =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "link"
  | "image"
  | "bullet"
  | "numbered"
  | "quote";

interface WrapResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function wrapInline(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = "text"
): WrapResult {
  const selected = value.slice(start, end);
  const content = selected || placeholder;
  const next = `${value.slice(0, start)}${before}${content}${after}${value.slice(end)}`;
  const selectionStart = start + before.length;
  return {
    value: next,
    selectionStart,
    selectionEnd: selectionStart + content.length
  };
}

function prefixLines(
  value: string,
  start: number,
  end: number,
  prefixForIndex: (index: number) => string
): WrapResult {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndSearch = value.indexOf("\n", end);
  const lineEnd = lineEndSearch === -1 ? value.length : lineEndSearch;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const rewritten = lines.map((line, index) => `${prefixForIndex(index)}${line || "List item"}`).join("\n");
  const next = `${value.slice(0, lineStart)}${rewritten}${value.slice(lineEnd)}`;
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + rewritten.length
  };
}

export function applyMarkdownFormat(
  value: string,
  start: number,
  end: number,
  format: MarkdownFormat,
  extras?: { url?: string; alt?: string }
): WrapResult {
  switch (format) {
    case "bold":
      return wrapInline(value, start, end, "**", "**", "bold text");
    case "italic":
      return wrapInline(value, start, end, "*", "*", "italic text");
    case "strike":
      return wrapInline(value, start, end, "~~", "~~", "text");
    case "code":
      return wrapInline(value, start, end, "`", "`", "code");
    case "link": {
      const url = extras?.url?.trim() || "https://";
      const selected = value.slice(start, end) || "link text";
      const snippet = `[${selected}](${url})`;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      return {
        value: next,
        selectionStart: start,
        selectionEnd: start + snippet.length
      };
    }
    case "image": {
      const url = extras?.url?.trim() || "https://";
      const alt = extras?.alt?.trim() || "image";
      const snippet = `![${alt}](${url})`;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      return {
        value: next,
        selectionStart: start,
        selectionEnd: start + snippet.length
      };
    }
    case "bullet":
      return prefixLines(value, start, end, () => "- ");
    case "numbered":
      return prefixLines(value, start, end, (index) => `${index + 1}. `);
    case "quote":
      return prefixLines(value, start, end, () => "> ");
    default:
      return { value, selectionStart: start, selectionEnd: end };
  }
}

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "strike"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: InlineNode[] }
  | { type: "image"; src: string; alt: string };

export type BlockNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "quote"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

function parseInlines(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern =
    /(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*(.+?)\*\*)|(~~(.+?)~~)|(`([^`]+)`)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      nodes.push({ type: "image", alt: match[2] || "image", src: match[3] });
    } else if (match[4]) {
      nodes.push({ type: "link", href: match[6], children: parseInlines(match[5]) });
    } else if (match[7]) {
      nodes.push({ type: "strong", children: parseInlines(match[8]) });
    } else if (match[9]) {
      nodes.push({ type: "strike", children: parseInlines(match[10]) });
    } else if (match[11]) {
      nodes.push({ type: "code", value: match[12] });
    } else if (match[13]) {
      nodes.push({ type: "em", children: parseInlines(match[14]) });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    nodes.push({ type: "text", value: input.slice(lastIndex) });
  }

  return nodes.length ? nodes : [{ type: "text", value: "" }];
}

export function parseMarkdown(source: string): BlockNode[] {
  const normalized = source.replaceAll("\r\n", "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: BlockNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        children: parseInlines(headingMatch[2].trim())
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", children: parseInlines(quoteLines.join("\n")) });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: InlineNode[][] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(parseInlines(lines[index].replace(/^\s*[-*]\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: InlineNode[][] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(parseInlines(lines[index].replace(/^\s*\d+\.\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", children: parseInlines(paragraphLines.join("\n")) });
  }

  return blocks;
}
