/** True when stored content is already TipTap/HTML rather than legacy markdown. */
export function looksLikeHtml(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed.includes("data-mb-")) return true;
  return /^<(p|h[1-6]|div|ul|ol|table|pre|blockquote|hr|img)\b/i.test(trimmed);
}
