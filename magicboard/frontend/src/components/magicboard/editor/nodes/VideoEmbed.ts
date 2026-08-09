import { Node, mergeAttributes } from "@tiptap/core";

const ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "www.loom.com",
  "loom.com"
];

export function toEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      return null;
    }
    if (host.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (url.pathname.startsWith("/embed/")) return url.toString();
      return null;
    }
    if (host.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.includes("loom.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const shareIdx = parts.indexOf("share");
      const id = shareIdx >= 0 ? parts[shareIdx + 1] : parts.pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      insertVideo: (src: string) => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-video") || element.getAttribute("src") || "",
        renderHTML: (attributes) => ({ "data-mb-video": attributes.src })
      }
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-mb-video]" },
      { tag: "iframe[data-mb-video]" }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs.src as string;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "mb-video-embed", "data-mb-video": src }),
      [
        "iframe",
        {
          src,
          title: "Video embed",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          frameborder: "0",
          referrerpolicy: "strict-origin-when-cross-origin"
        }
      ]
    ];
  },

  addCommands() {
    return {
      insertVideo:
        (src: string) =>
        ({ commands }) => {
          const embed = toEmbedUrl(src);
          if (!embed) return false;
          return commands.insertContent({ type: this.name, attrs: { src: embed } });
        }
    };
  }
});
