export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown size";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

export type FileKind = "image" | "pdf" | "doc" | "sheet" | "archive" | "code" | "file";

export function getFileKind(filename: string, contentType?: string | null): FileKind {
  const lowerName = filename.toLowerCase();
  const type = (contentType ?? "").toLowerCase();

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(lowerName)) {
    return "image";
  }
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    /\.(xlsx?|csv|tsv)$/.test(lowerName)
  ) {
    return "sheet";
  }
  if (
    type.includes("word") ||
    type.includes("document") ||
    /\.(docx?|rtf|txt|md)$/.test(lowerName)
  ) {
    return "doc";
  }
  if (type.includes("zip") || type.includes("compressed") || /\.(zip|rar|7z|tar|gz)$/.test(lowerName)) {
    return "archive";
  }
  if (/\.(js|ts|tsx|jsx|py|java|go|rs|json|ya?ml|html|css)$/.test(lowerName)) {
    return "code";
  }
  return "file";
}
