import type { ReactNode } from "react";

type ProfileWorkspaceEmptyStateProps = {
  eyebrow?: string;
  title: string;
  copy: string;
  actions?: ReactNode;
  className?: string;
};

export default function ProfileWorkspaceEmptyState({
  eyebrow,
  title,
  copy,
  actions,
  className
}: ProfileWorkspaceEmptyStateProps) {
  return (
    <section className={["pagePanel", "profileTabPanel", "profileWorkspaceEmptyState", className ?? ""].filter(Boolean).join(" ")}>
      <div className="profileWorkspaceEmptyVisual" aria-hidden="true">
        <div className="profileWorkspaceEmptyFrame">
          <span className="profileWorkspaceEmptyTile primary" />
          <span className="profileWorkspaceEmptyTile secondary" />
          <span className="profileWorkspaceEmptyLine long" />
          <span className="profileWorkspaceEmptyLine short" />
        </div>
      </div>

      <div className="profileWorkspaceEmptyCopy">
        {eyebrow ? <span className="profileWorkspaceEmptyEyebrow">{eyebrow}</span> : null}
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>

      {actions ? <div className="profileWorkspaceEmptyActions">{actions}</div> : null}
    </section>
  );
}
