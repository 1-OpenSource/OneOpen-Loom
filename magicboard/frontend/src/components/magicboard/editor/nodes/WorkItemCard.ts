import { Node, mergeAttributes } from "@tiptap/core";

export interface WorkItemCardAttrs {
  key: string;
  title?: string;
  status?: string;
  type?: string;
  priority?: string;
  workItemId?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    workItemCard: {
      insertWorkItemCard: (attrs: WorkItemCardAttrs) => ReturnType;
    };
  }
}

export const WorkItemCard = Node.create({
  name: "workItemCard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      key: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem") || "",
        renderHTML: (attributes) => ({ "data-mb-workitem": attributes.key })
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem-title") || "",
        renderHTML: (attributes) =>
          attributes.title ? { "data-mb-workitem-title": attributes.title } : {}
      },
      status: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem-status") || "",
        renderHTML: (attributes) =>
          attributes.status ? { "data-mb-workitem-status": attributes.status } : {}
      },
      type: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem-type") || "",
        renderHTML: (attributes) =>
          attributes.type ? { "data-mb-workitem-type": attributes.type } : {}
      },
      priority: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem-priority") || "",
        renderHTML: (attributes) =>
          attributes.priority ? { "data-mb-workitem-priority": attributes.priority } : {}
      },
      workItemId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mb-workitem-id") || "",
        renderHTML: (attributes) =>
          attributes.workItemId ? { "data-mb-workitem-id": attributes.workItemId } : {}
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mb-workitem]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = node.attrs.title || node.attrs.key;
    const meta = [node.attrs.status, node.attrs.type, node.attrs.priority]
      .filter(Boolean)
      .join(" · ");
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "mb-workitem-card" }),
      ["span", { class: "item-key" }, node.attrs.key],
      ["strong", {}, title],
      meta ? ["span", { class: "mb-quiet" }, meta] : ["span", {}, ""]
    ];
  },

  addCommands() {
    return {
      insertWorkItemCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs })
    };
  }
});
