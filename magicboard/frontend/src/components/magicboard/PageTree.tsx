import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { SpacePageTreeNode } from "../../types/magicboard";

function TreeNode({
  node,
  spaceId,
  activePageId,
  depth = 0
}: {
  node: SpacePageTreeNode;
  spaceId: string;
  activePageId?: string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === activePageId;
  const isDraft = node.status === "DRAFT";

  return (
    <li className="magicboard-tree-node">
      <div className={`magicboard-tree-row${isActive ? " is-active" : ""}`} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="magicboard-tree-toggle"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="magicboard-tree-spacer" aria-hidden="true" />
        )}
        <Link to={`/magicboard/spaces/${spaceId}/pages/${node.id}`} className="magicboard-tree-link">
          <FileText size={14} />
          <span>{node.title}</span>
          {isDraft ? <span className="mb-page-status-badge is-draft">Draft</span> : null}
        </Link>
      </div>
      {hasChildren && expanded ? (
        <ul className="magicboard-tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} spaceId={spaceId} activePageId={activePageId} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function PageTree({
  tree,
  spaceId,
  activePageId
}: {
  tree: SpacePageTreeNode[];
  spaceId: string;
  activePageId?: string;
}) {
  if (!tree.length) {
    return <p className="muted-copy magicboard-tree-empty">No pages yet.</p>;
  }

  return (
    <ul className="magicboard-tree">
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} spaceId={spaceId} activePageId={activePageId} />
      ))}
    </ul>
  );
}
