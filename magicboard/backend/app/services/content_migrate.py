"""Convert legacy Magicboard markdown/macros to TipTap HTML."""

from __future__ import annotations

import html
import re

_HTML_HINT = re.compile(r"^<(p|h[1-6]|div|ul|ol|table|pre|blockquote|hr|img)\b", re.I)


def looks_like_html(content: str) -> bool:
    trimmed = (content or "").strip()
    if not trimmed:
        return True
    if "data-mb-" in trimmed:
        return True
    return bool(_HTML_HINT.match(trimmed))


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _inline_to_html(text: str) -> str:
    out = _escape(text)
    out = re.sub(
        r"!\[([^\]]*)\]\(([^)\s]+)\)",
        lambda m: f'<img src="{_escape(m.group(2))}" alt="{_escape(m.group(1) or "image")}" />',
        out,
    )
    out = re.sub(
        r"\[([^\]]+)\]\(([^)\s]+)\)",
        lambda m: f'<a href="{_escape(m.group(2))}">{m.group(1)}</a>',
        out,
    )
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"~~(.+?)~~", r"<s>\1</s>", out)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*(.+?)\*", r"<em>\1</em>", out)
    return out


def macro_to_html(raw: str) -> str:
    trimmed = raw.strip()
    if trimmed == "toc":
        return '<div data-mb-toc="true"></div>'
    if trimmed.startswith("workitem:"):
        key = _escape(trimmed[len("workitem:") :].strip())
        return f'<div data-mb-workitem="{key}"></div>'
    if trimmed.startswith("info:"):
        text = trimmed[len("info:") :].strip() or "Info"
        return f'<div data-mb-panel="info"><p>{_inline_to_html(text)}</p></div>'
    if trimmed.startswith("warning:"):
        text = trimmed[len("warning:") :].strip() or "Warning"
        return f'<div data-mb-panel="warning"><p>{_inline_to_html(text)}</p></div>'
    if trimmed.startswith("note:"):
        text = trimmed[len("note:") :].strip() or "Note"
        return f'<div data-mb-panel="note"><p>{_inline_to_html(text)}</p></div>'
    if trimmed.startswith("tip:"):
        text = trimmed[len("tip:") :].strip() or "Tip"
        return f'<div data-mb-panel="tip"><p>{_inline_to_html(text)}</p></div>'
    if trimmed.startswith("include:"):
        slug = _escape(trimmed[len("include:") :].strip())
        return f'<div data-mb-include="{slug}"></div>'
    return f"<p><code>{{{{{_escape(raw)}}}}}</code></p>"


def _convert_markdown_chunk(source: str) -> str:
    lines = source.replace("\r\n", "\n").split("\n")
    html_parts: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if heading:
            level = len(heading.group(1))
            html_parts.append(f"<h{level}>{_inline_to_html(heading.group(2).strip())}</h{level}>")
            index += 1
            continue

        if line.strip().startswith("```"):
            lang = line.strip()[3:].strip()
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            if index < len(lines):
                index += 1
            lang_attr = f' class="language-{_escape(lang)}"' if lang else ""
            html_parts.append(f"<pre><code{lang_attr}>{_escape(chr(10).join(code_lines))}</code></pre>")
            continue

        if re.match(r"^>\s?", line):
            quote_lines: list[str] = []
            while index < len(lines) and re.match(r"^>\s?", lines[index]):
                quote_lines.append(re.sub(r"^>\s?", "", lines[index]))
                index += 1
            html_parts.append(f"<blockquote><p>{_inline_to_html(' '.join(quote_lines))}</p></blockquote>")
            continue

        if re.match(r"^\s*[-*]\s+", line):
            items: list[str] = []
            while index < len(lines) and re.match(r"^\s*[-*]\s+", lines[index]):
                items.append(f"<li>{_inline_to_html(re.sub(r'^\\s*[-*]\\s+', '', lines[index]))}</li>")
                index += 1
            html_parts.append(f"<ul>{''.join(items)}</ul>")
            continue

        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while index < len(lines) and re.match(r"^\s*\d+\.\s+", lines[index]):
                items.append(f"<li>{_inline_to_html(re.sub(r'^\\s*\\d+\\.\\s+', '', lines[index]))}</li>")
                index += 1
            html_parts.append(f"<ol>{''.join(items)}</ol>")
            continue

        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", line.strip()):
            html_parts.append("<hr />")
            index += 1
            continue

        paragraph_lines: list[str] = []
        while (
            index < len(lines)
            and lines[index].strip()
            and not re.match(r"^#{1,6}\s+", lines[index].strip())
            and not re.match(r"^>\s?", lines[index])
            and not re.match(r"^\s*[-*]\s+", lines[index])
            and not re.match(r"^\s*\d+\.\s+", lines[index])
            and not lines[index].strip().startswith("```")
            and not re.match(r"^(-{3,}|\*{3,}|_{3,})$", lines[index].strip())
        ):
            paragraph_lines.append(lines[index])
            index += 1
        html_parts.append(f"<p>{_inline_to_html(' '.join(paragraph_lines))}</p>")

    return "\n".join(html_parts)


def legacy_markdown_to_html(source: str) -> str:
    if not (source or "").strip():
        return "<p></p>"
    if looks_like_html(source):
        return source

    parts: list[str] = []
    last = 0
    for match in re.finditer(r"\{\{([^}]+)\}\}", source):
        if match.start() > last:
            parts.append(_convert_markdown_chunk(source[last : match.start()]))
        parts.append(macro_to_html(match.group(1)))
        last = match.end()
    if last < len(source):
        parts.append(_convert_markdown_chunk(source[last:]))

    html_out = "\n".join(part for part in parts if part).strip()
    return html_out or "<p></p>"
