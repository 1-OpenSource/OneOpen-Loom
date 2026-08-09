import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "iframe",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul"
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "width",
  "height",
  "allow",
  "allowfullscreen",
  "frameborder",
  "referrerpolicy",
  "data-mb-panel",
  "data-mb-status",
  "data-mb-date",
  "data-mb-toc",
  "data-mb-include",
  "data-mb-workitem",
  "data-mb-workitem-title",
  "data-mb-workitem-status",
  "data-mb-workitem-type",
  "data-mb-workitem-priority",
  "data-mb-workitem-id",
  "data-mb-video",
  "data-mb-file",
  "data-mb-filename",
  "data-mb-attachment-id"
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
    ALLOW_DATA_ATTR: true
  });
}
