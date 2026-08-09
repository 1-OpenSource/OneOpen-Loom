import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toc: {
      insertToc: () => ReturnType;
    };
  }
}

export const Toc = Node.create({
  name: "toc",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: "div[data-mb-toc]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-mb-toc": "true", class: "mb-toc-node" }),
      ["strong", {}, "Table of contents"],
      ["p", { class: "mb-quiet" }, "Headings on this page appear here when published."]
    ];
  },

  addCommands() {
    return {
      insertToc:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name })
    };
  }
});
