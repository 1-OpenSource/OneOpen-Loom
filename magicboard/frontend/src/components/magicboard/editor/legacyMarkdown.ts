import { looksLikeHtml } from "./contentDetect";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineToHtml(input: string): string {
  let out = escapeHtml(input);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    return `<img src="${src}" alt="${escapeHtml(alt || "image")}" />`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    return `<a href="${href}">${text}</a>`;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/~~(.+?)~~/g, "<s>$1</s>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return out;
}

export function macroToHtml(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "toc") {
    return `<div data-mb-toc="true"></div>`;
  }
  if (trimmed.startsWith("workitem:")) {
    const key = escapeHtml(trimmed.slice("workitem:".length).trim());
    return `<div data-mb-workitem="${key}"></div>`;
  }
  if (trimmed.startsWith("info:")) {
    const text = trimmed.slice("info:".length).trim() || "Info";
    return `<div data-mb-panel="info"><p>${inlineToHtml(text)}</p></div>`;
  }
  if (trimmed.startsWith("warning:")) {
    const text = trimmed.slice("warning:".length).trim() || "Warning";
    return `<div data-mb-panel="warning"><p>${inlineToHtml(text)}</p></div>`;
  }
  if (trimmed.startsWith("note:")) {
    const text = trimmed.slice("note:".length).trim() || "Note";
    return `<div data-mb-panel="note"><p>${inlineToHtml(text)}</p></div>`;
  }
  if (trimmed.startsWith("tip:")) {
    const text = trimmed.slice("tip:".length).trim() || "Tip";
    return `<div data-mb-panel="tip"><p>${inlineToHtml(text)}</p></div>`;
  }
  if (trimmed.startsWith("include:")) {
    const slug = escapeHtml(trimmed.slice("include:".length).trim());
    return `<div data-mb-include="${slug}"></div>`;
  }
  return `<p><code>{{${escapeHtml(raw)}}}</code></p>`;
}

function convertMarkdownChunk(source: string): string {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineToHtml(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim();
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote><p>${inlineToHtml(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(`<li>${inlineToHtml(lines[index].replace(/^\s*[-*]\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${inlineToHtml(lines[index].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^```/.test(lines[index].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${inlineToHtml(paragraphLines.join(" "))}</p>`);
  }

  return html.join("\n");
}

/** Convert legacy markdown/macros to TipTap-compatible HTML. Idempotent for HTML input. */
export function legacyMarkdownToHtml(source: string): string {
  if (!source?.trim()) return "<p></p>";
  if (looksLikeHtml(source)) return source;

  const parts: string[] = [];
  const pattern = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push(convertMarkdownChunk(source.slice(lastIndex, match.index)));
    }
    parts.push(macroToHtml(match[1]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) {
    parts.push(convertMarkdownChunk(source.slice(lastIndex)));
  }

  const html = parts.filter(Boolean).join("\n").trim();
  return html || "<p></p>";
}
