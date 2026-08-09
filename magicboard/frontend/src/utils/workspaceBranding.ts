function darkenHex(hex: string, amount = 0.12): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = Number.parseInt(normalized, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 255) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round((num & 255) * (1 - amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function softHex(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#fff3e8";
  const num = Number.parseInt(normalized, 16);
  const r = Math.round(255 * 0.88 + ((num >> 16) & 255) * 0.12);
  const g = Math.round(255 * 0.88 + ((num >> 8) & 255) * 0.12);
  const b = Math.round(255 * 0.88 + (num & 255) * 0.12);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function applyWorkspaceBranding(accentColor?: string | null) {
  const root = document.documentElement;
  const accent = accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#e86a17";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-hover", darkenHex(accent));
  root.style.setProperty("--accent-soft", softHex(accent));
  root.style.setProperty("--secondary", accent);
  root.style.setProperty("--secondary-hover", darkenHex(accent));
  root.style.setProperty("--secondary-soft", softHex(accent));
}
