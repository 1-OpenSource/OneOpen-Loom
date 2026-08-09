const DEFAULT_ACCENT = "#0f766e";

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
  if (normalized.length !== 6) return "#e6f4f2";
  const num = Number.parseInt(normalized, 16);
  const r = Math.round(255 * 0.88 + ((num >> 16) & 255) * 0.12);
  const g = Math.round(255 * 0.88 + ((num >> 8) & 255) * 0.12);
  const b = Math.round(255 * 0.88 + (num & 255) * 0.12);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

type BrandingInput = string | null | undefined | { accent_color?: string | null };

function resolveAccent(input: BrandingInput): string {
  if (typeof input === "string" && /^#[0-9a-fA-F]{6}$/.test(input)) {
    return input;
  }
  if (input && typeof input === "object") {
    const accent = input.accent_color;
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
      return accent;
    }
  }
  return DEFAULT_ACCENT;
}

/** Apply Magicboard accent tokens. Accepts a hex string or a workspace-like object. */
export function applyWorkspaceBranding(input?: BrandingInput) {
  const root = document.documentElement;
  const accent = resolveAccent(input);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-hover", darkenHex(accent));
  root.style.setProperty("--accent-soft", softHex(accent));
  root.style.setProperty("--accent-border", softHex(darkenHex(accent, 0.35)));
  root.style.setProperty("--secondary", accent);
  root.style.setProperty("--secondary-hover", darkenHex(accent));
  root.style.setProperty("--secondary-soft", softHex(accent));
  root.style.setProperty("--secondary-border", softHex(darkenHex(accent, 0.35)));
}
