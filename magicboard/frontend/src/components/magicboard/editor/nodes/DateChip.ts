import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dateChip: {
      insertDate: (iso?: string) => ReturnType;
    };
  }
}

export const DateChip = Node.create({
  name: "dateChip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      date: {
        default: new Date().toISOString().slice(0, 10),
        parseHTML: (element) => element.getAttribute("data-mb-date"),
        renderHTML: (attributes) => ({ "data-mb-date": attributes.date })
      }
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mb-date]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "mb-date-chip" }),
      node.attrs.date
    ];
  },

  addCommands() {
    return {
      insertDate:
        (iso?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { date: iso || new Date().toISOString().slice(0, 10) }
          })
    };
  }
});
