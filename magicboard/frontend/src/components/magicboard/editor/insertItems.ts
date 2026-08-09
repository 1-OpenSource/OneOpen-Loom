import type { Editor } from "@tiptap/core";
import { toEmbedUrl } from "./nodes/VideoEmbed";

export type InsertActionContext = {
  editor: Editor;
  uploadImage?: () => Promise<{ src: string; alt?: string } | null>;
  uploadFile?: () => Promise<{ attachmentId: string; filename: string } | null>;
  pickIncludePage?: () => Promise<string | null>;
  pickWorkItem?: () => Promise<{
    key: string;
    title?: string;
    status?: string;
    type?: string;
    priority?: string;
    workItemId?: string;
  } | null>;
  workboardConnected?: boolean;
};

export type InsertItem = {
  id: string;
  label: string;
  keywords: string[];
  group: string;
  run: (ctx: InsertActionContext) => void | Promise<void>;
};

function promptValue(message: string, fallback = ""): string | null {
  const value = window.prompt(message, fallback);
  return value === null ? null : value.trim();
}

export const insertItems: InsertItem[] = [
  {
    id: "heading",
    label: "Heading",
    keywords: ["h1", "title"],
    group: "Text",
    run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: "table",
    label: "Table",
    keywords: ["grid"],
    group: "Structure",
    run: ({ editor }) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    id: "code",
    label: "Code block",
    keywords: ["code", "snippet"],
    group: "Structure",
    run: ({ editor }) => editor.chain().focus().toggleCodeBlock().run()
  },
  {
    id: "divider",
    label: "Divider",
    keywords: ["hr", "line"],
    group: "Structure",
    run: ({ editor }) => editor.chain().focus().setHorizontalRule().run()
  },
  {
    id: "link",
    label: "Link",
    keywords: ["url", "href"],
    group: "Media",
    run: ({ editor }) => {
      const url = promptValue("Link URL", "https://");
      if (!url) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  },
  {
    id: "image",
    label: "Image",
    keywords: ["picture", "photo", "upload"],
    group: "Media",
    run: async ({ editor, uploadImage }) => {
      if (uploadImage) {
        const result = await uploadImage();
        if (!result) return;
        editor.chain().focus().setImage({ src: result.src, alt: result.alt || "image" }).run();
        return;
      }
      const url = promptValue("Image URL or attachment:uuid");
      if (!url) return;
      editor.chain().focus().setImage({ src: url, alt: "image" }).run();
    }
  },
  {
    id: "video",
    label: "Video",
    keywords: ["youtube", "vimeo", "loom", "embed"],
    group: "Media",
    run: ({ editor }) => {
      const url = promptValue("YouTube, Vimeo, or Loom URL");
      if (!url || !toEmbedUrl(url)) {
        if (url) window.alert("Only YouTube, Vimeo, and Loom URLs are supported.");
        return;
      }
      editor.chain().focus().insertVideo(url).run();
    }
  },
  {
    id: "file",
    label: "File",
    keywords: ["attachment", "upload", "document"],
    group: "Media",
    run: async ({ editor, uploadFile }) => {
      if (!uploadFile) return;
      const result = await uploadFile();
      if (!result) return;
      editor.chain().focus().insertFileCard(result).run();
    }
  },
  {
    id: "info",
    label: "Info panel",
    keywords: ["callout", "panel"],
    group: "Panels",
    run: ({ editor }) => editor.chain().focus().insertPanel("info").run()
  },
  {
    id: "warning",
    label: "Warning panel",
    keywords: ["callout", "alert"],
    group: "Panels",
    run: ({ editor }) => editor.chain().focus().insertPanel("warning", "Warning").run()
  },
  {
    id: "note",
    label: "Note panel",
    keywords: ["callout"],
    group: "Panels",
    run: ({ editor }) => editor.chain().focus().insertPanel("note", "Note").run()
  },
  {
    id: "tip",
    label: "Tip panel",
    keywords: ["callout"],
    group: "Panels",
    run: ({ editor }) => editor.chain().focus().insertPanel("tip", "Tip").run()
  },
  {
    id: "status",
    label: "Status",
    keywords: ["lozenge", "badge"],
    group: "Inline",
    run: ({ editor }) => {
      const label = promptValue("Status label", "In progress");
      if (!label) return;
      editor.chain().focus().insertStatus(label).run();
    }
  },
  {
    id: "date",
    label: "Date",
    keywords: ["calendar"],
    group: "Inline",
    run: ({ editor }) => editor.chain().focus().insertDate().run()
  },
  {
    id: "emoji",
    label: "Emoji",
    keywords: ["smiley"],
    group: "Inline",
    run: ({ editor }) => {
      const emoji = promptValue("Emoji", "✅");
      if (!emoji) return;
      editor.chain().focus().insertContent(emoji).run();
    }
  },
  {
    id: "toc",
    label: "Table of contents",
    keywords: ["toc", "outline"],
    group: "Macros",
    run: ({ editor }) => editor.chain().focus().insertToc().run()
  },
  {
    id: "include",
    label: "Include page",
    keywords: ["embed", "page"],
    group: "Macros",
    run: async ({ editor, pickIncludePage }) => {
      const slug = pickIncludePage ? await pickIncludePage() : promptValue("Page slug to include");
      if (!slug) return;
      editor.chain().focus().insertIncludePage(slug).run();
    }
  },
  {
    id: "workitem",
    label: "Work item",
    keywords: ["ticket", "issue", "card", "smart"],
    group: "Macros",
    run: async ({ editor, pickWorkItem, workboardConnected }) => {
      if (!workboardConnected) {
        window.alert("Connect Workboard to insert work item smart cards.");
        return;
      }
      if (!pickWorkItem) return;
      const item = await pickWorkItem();
      if (!item) return;
      editor.chain().focus().insertWorkItemCard(item).run();
    }
  },
  {
    id: "mention",
    label: "Mention",
    keywords: ["@", "person", "member"],
    group: "Inline",
    run: ({ editor }) => {
      const name = promptValue("Mention name", "@");
      if (!name) return;
      const text = name.startsWith("@") ? name : `@${name}`;
      editor.chain().focus().insertContent(`${text} `).run();
    }
  }
];

export function filterInsertItems(query: string, workboardConnected: boolean): InsertItem[] {
  const q = query.trim().toLowerCase();
  return insertItems.filter((item) => {
    if (item.id === "workitem" && !workboardConnected) return false;
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((keyword) => keyword.includes(q)) ||
      item.id.includes(q)
    );
  });
}
