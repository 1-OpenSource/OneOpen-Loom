import { useEffect, useState } from "react";
import { magicboardService } from "../../../services/magicboardService";

export default function AttachmentImg({ src, alt }: { src: string; alt: string }) {
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

  if (!resolved) return <span className="md-image-fallback">{alt || "Image"}</span>;
  return <img className="md-image" src={resolved} alt={alt} loading="lazy" />;
}
