import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileCard: {
      insertFileCard: (attrs: { attachmentId: string; filename: string }) => ReturnType;
    };
  }
}

export const FileCard = Node.create({
  name: "fileCard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      attachmentId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-attachment-id") || "",
        renderHTML: (attributes) => ({ "data-mb-attachment-id": attributes.attachmentId })
      },
      filename: {
        default: "file",
        parseHTML: (element) => element.getAttribute("data-mb-filename") || "file",
        renderHTML: (attributes) => ({ "data-mb-filename": attributes.filename })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mb-file]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-mb-file": "true",
        class: "mb-file-card"
      }),
      ["strong", {}, "Attachment"],
      ["span", {}, node.attrs.filename || "file"]
    ];
  },

  addCommands() {
    return {
      insertFileCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs })
    };
  }
});
