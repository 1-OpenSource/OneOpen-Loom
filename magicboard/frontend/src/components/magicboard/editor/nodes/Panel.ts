import { Node, mergeAttributes } from "@tiptap/core";

export type PanelVariant = "info" | "warning" | "note" | "tip";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    panel: {
      insertPanel: (variant?: PanelVariant, text?: string) => ReturnType;
    };
  }
}

export const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-mb-panel") || "info",
        renderHTML: (attributes) => ({ "data-mb-panel": attributes.variant })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mb-panel]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "mb-panel" }), 0];
  },

  addCommands() {
    return {
      insertPanel:
        (variant: PanelVariant = "info", text = "Panel text") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph", content: [{ type: "text", text }] }]
          })
    };
  }
});
