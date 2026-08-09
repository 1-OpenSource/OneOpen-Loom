import { HocuspocusProvider } from "@hocuspocus/provider";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import Button from "../../ui/Button";
import { useAuth } from "../../../hooks/useAuth";
import { magicboardService } from "../../../services/magicboardService";
import { getAuthToken } from "../../../utils/authToken";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import { buildExtensions } from "./extensions";
import IncludePageModal from "./IncludePageModal";
import InsertMenu from "./InsertMenu";
import type { InsertActionContext } from "./insertItems";
import { legacyMarkdownToHtml } from "./legacyMarkdown";
import SlashMenu from "./SlashMenu";
import WorkItemPickerModal from "./WorkItemPickerModal";

const collabUrl = (import.meta.env.VITE_COLLAB_URL as string | undefined)?.trim();

type Props = {
  pageId: string;
  spaceId: string;
  workspaceId: string;
  initialContent: string;
  onChange: (html: string) => void;
  onAttachmentUploaded?: () => void;
};

function userColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 65% 42%)`;
}

function isEditorReady(editor: Editor | null): editor is Editor {
  return Boolean(editor && !editor.isDestroyed);
}

export default function PageEditor({
  pageId,
  spaceId,
  workspaceId,
  initialContent,
  onChange,
  onAttachmentUploaded
}: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadResolver = useRef<{
    resolve: (value: File | null) => void;
  } | null>(null);
  const onChangeRef = useRef(onChange);
  const onAttachmentUploadedRef = useRef(onAttachmentUploaded);
  const editorRef = useRef<Editor | null>(null);
  const seededPageRef = useRef<string | null>(null);

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashAnchor, setSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const [includeOpen, setIncludeOpen] = useState(false);
  const [workItemOpen, setWorkItemOpen] = useState(false);
  const includeResolver = useRef<((slug: string | null) => void) | null>(null);
  const workItemResolver = useRef<
    ((
      item: {
        key: string;
        title?: string;
        status?: string;
        type?: string;
        priority?: string;
        workItemId?: string;
      } | null
    ) => void) | null
  >(null);
  const [peerCount, setPeerCount] = useState(0);
  const [workboardConnected, setWorkboardConnected] = useState(
    Boolean((import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim())
  );
  const [collab, setCollab] = useState<
    | {
        document: Y.Doc;
        provider: HocuspocusProvider;
        user: { name: string; color: string };
      }
    | undefined
  >(undefined);
  const [collabBootstrapped, setCollabBootstrapped] = useState(!collabUrl);

  const htmlContent = useMemo(() => legacyMarkdownToHtml(initialContent), [initialContent]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onAttachmentUploadedRef.current = onAttachmentUploaded;
  }, [onAttachmentUploaded]);

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      try {
        const response = await fetch(
          `${(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8002"}/health`
        );
        if (!response.ok) return;
        const data = (await response.json()) as { workboard_connector?: boolean };
        if (!cancelled && typeof data.workboard_connector === "boolean") {
          setWorkboardConnected(data.workboard_connector);
        }
      } catch {
        /* optional */
      }
    }
    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!collabUrl || !user) {
      setCollab(undefined);
      setCollabBootstrapped(true);
      return;
    }
    setCollabBootstrapped(false);
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: collabUrl,
      name: `page-${pageId}`,
      document: ydoc,
      token: getAuthToken() || ""
    });
    const onAwareness = () => {
      const states = provider.awareness?.getStates();
      setPeerCount(states ? Math.max(0, states.size - 1) : 0);
    };
    provider.awareness?.on("change", onAwareness);
    setCollab({
      document: ydoc,
      provider,
      user: { name: user.name || user.email, color: userColor(user.id) }
    });
    setCollabBootstrapped(true);
    return () => {
      provider.awareness?.off("change", onAwareness);
      provider.destroy();
      ydoc.destroy();
      setCollab(undefined);
      setPeerCount(0);
    };
  }, [pageId, user?.id, user?.name, user?.email]);

  const updateSlashState = useCallback((current: Editor) => {
    if (!isEditorReady(current)) return;
    const { from, empty } = current.state.selection;
    if (!empty) {
      setSlashOpen(false);
      return;
    }
    const textBefore = current.state.doc.textBetween(Math.max(0, from - 40), from, "\n", "\0");
    const match = /(?:^|\s)\/([^\s]*)$/.exec(textBefore);
    if (!match) {
      setSlashOpen(false);
      return;
    }
    setSlashQuery(match[1] || "");
    const coords = current.view.coordsAtPos(from);
    setSlashAnchor({ top: coords.bottom + 6, left: coords.left });
    setSlashOpen(true);
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: buildExtensions(collab),
      content: collab ? undefined : htmlContent,
      onUpdate: ({ editor: current }) => {
        if (!isEditorReady(current)) return;
        onChangeRef.current(current.getHTML());
        updateSlashState(current);
      },
      onSelectionUpdate: ({ editor: current }) => updateSlashState(current),
      editorProps: {
        attributes: {
          class: "mb-tiptap-editor"
        },
        handlePaste: (_view, event) => {
          const file = event.clipboardData?.files?.[0];
          const current = editorRef.current;
          if (file && file.type.startsWith("image/") && isEditorReady(current)) {
            event.preventDefault();
            void (async () => {
              try {
                const created = await magicboardService.uploadAttachment(pageId, file);
                if (!isEditorReady(current)) return;
                current
                  .chain()
                  .focus()
                  .setImage({ src: `attachment:${created.id}`, alt: created.filename })
                  .run();
                onAttachmentUploadedRef.current?.();
              } catch (uploadError) {
                window.alert(getApiErrorMessage(uploadError, "Could not upload image"));
              }
            })();
            return true;
          }
          return false;
        }
      }
    },
    // Recreate only when page or collab document changes — not on every parent render.
    [pageId, collab?.document, collabBootstrapped]
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    seededPageRef.current = null;
  }, [pageId]);

  useEffect(() => {
    if (!isEditorReady(editor) || collab) return;
    if (seededPageRef.current === pageId) return;
    editor.commands.setContent(htmlContent, { emitUpdate: false });
    seededPageRef.current = pageId;
  }, [editor, htmlContent, collab, pageId]);

  useEffect(() => {
    if (!isEditorReady(editor) || !collab) return;
    if (seededPageRef.current === pageId) return;
    const fragment = collab.document.getXmlFragment("default");
    if (fragment.length === 0) {
      editor.commands.setContent(htmlContent, { emitUpdate: false });
    }
    seededPageRef.current = pageId;
  }, [editor, collab, htmlContent, pageId]);

  const pickFile = useCallback((imageOnly: boolean): Promise<File | null> => {
    return new Promise((resolve) => {
      uploadResolver.current = { resolve };
      const input = imageOnly ? imageInputRef.current : fileInputRef.current;
      input?.click();
    });
  }, []);

  const actionContext: Omit<InsertActionContext, "editor"> = useMemo(
    () => ({
      workboardConnected,
      uploadImage: async () => {
        const file = await pickFile(true);
        if (!file) return null;
        try {
          const created = await magicboardService.uploadAttachment(pageId, file);
          onAttachmentUploadedRef.current?.();
          return { src: `attachment:${created.id}`, alt: created.filename };
        } catch (uploadError) {
          window.alert(getApiErrorMessage(uploadError, "Could not upload image"));
          return null;
        }
      },
      uploadFile: async () => {
        const file = await pickFile(false);
        if (!file) return null;
        try {
          const created = await magicboardService.uploadAttachment(pageId, file);
          onAttachmentUploadedRef.current?.();
          return { attachmentId: created.id, filename: created.filename };
        } catch (uploadError) {
          window.alert(getApiErrorMessage(uploadError, "Could not upload file"));
          return null;
        }
      },
      pickIncludePage: () =>
        new Promise((resolve) => {
          includeResolver.current = resolve;
          setIncludeOpen(true);
        }),
      pickWorkItem: () =>
        new Promise((resolve) => {
          workItemResolver.current = resolve;
          setWorkItemOpen(true);
        })
    }),
    [workboardConnected, pageId, pickFile]
  );

  if (!collabBootstrapped) {
    return <div className="state-text">Connecting live editor…</div>;
  }

  if (!isEditorReady(editor)) {
    return <div className="state-text">Loading editor…</div>;
  }

  return (
    <div className="mb-page-editor">
      <div className="mb-editor-toolbar">
        <InsertMenu editor={editor} actionContext={actionContext} />
        <div className="mb-editor-format">
          <Button
            variant="secondary"
            icon={<Bold size={14} />}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <Button
            variant="secondary"
            icon={<Italic size={14} />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <Button
            variant="secondary"
            icon={<UnderlineIcon size={14} />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Button
            variant="secondary"
            icon={<Strikethrough size={14} />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <Button
            variant="secondary"
            icon={<Heading2 size={14} />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <Button
            variant="secondary"
            icon={<List size={14} />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <Button
            variant="secondary"
            icon={<ListOrdered size={14} />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Button
            variant="secondary"
            icon={<Code size={14} />}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
          {!collab ? (
            <>
              <Button
                variant="secondary"
                icon={<Undo2 size={14} />}
                onClick={() => editor.chain().focus().undo().run()}
              />
              <Button
                variant="secondary"
                icon={<Redo2 size={14} />}
                onClick={() => editor.chain().focus().redo().run()}
              />
            </>
          ) : null}
        </div>
        {collab ? (
          <div className="mb-collab-indicator" title="Live collaboration">
            <Users size={14} />
            <span>{peerCount > 0 ? `${peerCount} editing with you` : "Live"}</span>
          </div>
        ) : null}
      </div>

      <EditorContent editor={editor} />

      <SlashMenu
        editor={editor}
        open={slashOpen}
        query={slashQuery}
        anchor={slashAnchor}
        actionContext={actionContext}
        onClose={() => setSlashOpen(false)}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          uploadResolver.current?.resolve(file);
          uploadResolver.current = null;
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          uploadResolver.current?.resolve(file);
          uploadResolver.current = null;
          event.target.value = "";
        }}
      />

      <IncludePageModal
        spaceId={spaceId}
        open={includeOpen}
        onClose={() => {
          includeResolver.current?.(null);
          includeResolver.current = null;
          setIncludeOpen(false);
        }}
        onPick={(slug) => {
          includeResolver.current?.(slug);
          includeResolver.current = null;
        }}
      />
      <WorkItemPickerModal
        workspaceId={workspaceId}
        open={workItemOpen}
        onClose={() => {
          workItemResolver.current?.(null);
          workItemResolver.current = null;
          setWorkItemOpen(false);
        }}
        onPick={(item) => {
          workItemResolver.current?.({
            key: item.work_item_key,
            title: item.title,
            status: item.status,
            type: item.type,
            workItemId: item.id,
            priority: (item as { priority?: string }).priority
          });
          workItemResolver.current = null;
        }}
      />
    </div>
  );
}
