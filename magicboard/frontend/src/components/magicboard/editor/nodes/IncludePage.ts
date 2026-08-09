import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    includePage: {
      insertIncludePage: (slug: string) => ReturnType;
    };
  }
}

export const IncludePage = Node.create({
  name: "includePage",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-include") || "",
        renderHTML: (attributes) => ({ "data-mb-include": attributes.slug })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mb-include]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "mb-include-node" }),
      ["strong", {}, "Include page"],
      ["span", {}, node.attrs.slug || "(no slug)"]
    ];
  },

  addCommands() {
    return {
      insertIncludePage:
        (slug: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { slug } })
    };
  }
});
