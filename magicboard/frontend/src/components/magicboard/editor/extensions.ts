import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/core";
import type { Doc } from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { DateChip } from "./nodes/DateChip";
import { FileCard } from "./nodes/FileCard";
import { IncludePage } from "./nodes/IncludePage";
import { MbImage } from "./nodes/MbImage";
import { Panel } from "./nodes/Panel";
import { Status } from "./nodes/Status";
import { Toc } from "./nodes/Toc";
import { VideoEmbed } from "./nodes/VideoEmbed";
import { WorkItemCard } from "./nodes/WorkItemCard";

export interface CollabOptions {
  document: Doc;
  provider: HocuspocusProvider;
  user: { name: string; color: string };
}

export function buildExtensions(collab?: CollabOptions): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      undoRedo: collab ? false : undefined,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
      }
    }),
    MbImage.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder: "Type / to insert…"
    }),
    Panel,
    Status,
    DateChip,
    Toc,
    IncludePage,
    VideoEmbed,
    FileCard,
    WorkItemCard
  ];

  if (collab) {
    extensions.push(
      Collaboration.configure({ document: collab.document }),
      CollaborationCaret.configure({
        provider: collab.provider,
        user: collab.user
      })
    );
  }

  return extensions;
}
