import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { magicboardService } from "../../../../services/magicboardService";

function ImageView({ node }: NodeViewProps) {
  const src = String(node.attrs.src || "");
  const alt = String(node.attrs.alt || "image");
  const [resolved, setResolved] = useState(src.startsWith("attachment:") ? null : src);

  useEffect(() => {
    if (!src.startsWith("attachment:")) {
      setResolved(src);
      return;
    }
    const id = src.slice("attachment:".length);
    let objectUrl: string | null = null;
    let cancelled = false;
    void magicboardService
      .getAttachmentBlob(id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setResolved(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    <NodeViewWrapper className="mb-image-node">
      {resolved ? (
        <img src={resolved} alt={alt} className="mb-editor-image" />
      ) : (
        <span className="md-image-fallback">{alt}</span>
      )}
    </NodeViewWrapper>
  );
}

export const MbImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  }
});
