import { Eye, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MarkdownContent from "../components/ui/MarkdownContent";
import PageHeader from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { spaceService } from "../services/spaceService";
import type { SpacePage } from "../types/space";

export default function SpacePageEditor() {
  const { spaceId = "", pageId = "" } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [page, setPage] = useState<SpacePage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const result = await spaceService.getPage(pageId);
      if (!cancelled) {
        setPage(result);
        setTitle(result?.title ?? "");
        setContent(result?.content ?? "");
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  async function handleSave() {
    try {
      const updated = await spaceService.updatePage(pageId, { title, content });
      setPage(updated);
      pushToast("Page saved", "success");
    } catch (saveError) {
      pushToast(getApiErrorMessage(saveError, "Could not save page"), "error");
    }
  }

  async function handleDelete() {
    try {
      await spaceService.deletePage(pageId);
      pushToast("Page deleted", "success");
      navigate("/spaces");
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete page"), "error");
    }
  }

  if (isLoading) return <div className="state-text">Loading page…</div>;
  if (!page) return <div className="error-banner">Page not found.</div>;

  return (
    <>
      <PageHeader
        eyebrow="Space Page"
        title={title || "Untitled page"}
        description={`Space: ${spaceId}`}
        actions={
          <div className="button-row">
            <Button
              variant="secondary"
              icon={isPreview ? <Pencil size={16} /> : <Eye size={16} />}
              onClick={() => setIsPreview((value) => !value)}
            >
              {isPreview ? "Edit" : "Preview"}
            </Button>
            <Button icon={<Save size={16} />} onClick={() => void handleSave()}>
              Save
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void handleDelete()}>
              Delete
            </Button>
          </div>
        }
      />

      <Card>
        <div className="form-stack">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          {isPreview ? (
            <div className="space-page-preview">
              <MarkdownContent text={content} />
            </div>
          ) : (
            <label className="field" htmlFor="space-page-content">
              <span>Content (Markdown)</span>
              <textarea
                id="space-page-content"
                className="space-page-textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={20}
              />
            </label>
          )}
        </div>
      </Card>
    </>
  );
}
