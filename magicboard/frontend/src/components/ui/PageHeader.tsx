import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

export default function PageHeader({ eyebrow, title, description, meta, actions, compact = false }: PageHeaderProps) {
  return (
    <div className={`page-header${compact ? " page-header--compact" : ""}`}>
      <div className="page-header-copy">
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        {title ? <h1>{title}</h1> : null}
        {description ? <p className="page-header-description">{description}</p> : null}
        {meta ? <div className="page-header-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
