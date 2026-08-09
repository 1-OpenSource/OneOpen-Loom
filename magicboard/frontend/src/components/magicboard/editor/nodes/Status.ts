import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    statusChip: {
      insertStatus: (label?: string) => ReturnType;
    };
  }
}

export const Status = Node.create({
  name: "statusChip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "To do",
        parseHTML: (element) => element.getAttribute("data-mb-status") || "To do",
        renderHTML: (attributes) => ({ "data-mb-status": attributes.label })
      }
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mb-status]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "mb-status-chip" }),
      node.attrs.label
    ];
  },

  addCommands() {
    return {
      insertStatus:
        (label = "To do") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { label } })
    };
  }
});
