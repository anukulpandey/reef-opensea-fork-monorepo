import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { assetUrl } from "../lib/presentation";

type AmbientEmptyStateProps = {
  title: string;
  copy: string;
  eyebrow?: string;
  artwork?: string;
  artworkAlt?: string;
  actions?: ReactNode;
  variant?: "cards" | "rows" | "table";
  compact?: boolean;
  className?: string;
};

function buildSkeletonIndices(variant: AmbientEmptyStateProps["variant"]) {
  if (variant === "rows") {
    return [0, 1, 2];
  }
  if (variant === "table") {
    return [0, 1, 2, 3];
  }
  return [0, 1, 2, 3];
}

export default function AmbientEmptyState({
  title,
  copy,
  eyebrow,
  artwork,
  artworkAlt = "",
  actions,
  variant = "cards",
  compact = false,
  className
}: AmbientEmptyStateProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [artwork]);

  const resolvedArtwork = artwork?.trim() ? assetUrl(artwork) : "";
  const skeletons = buildSkeletonIndices(variant);
  const lineClasses = variant === "table" ? ["long", "short", "short", "short", "short"] : ["long", "medium", "short"];

  return (
    <section
      className={[
        "ambientEmptyState",
        `ambientEmptyState-${variant}`,
        compact ? "compact" : "",
        className ?? ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ambientEmptyBackdrop" aria-hidden="true">
        {skeletons.map((index) => (
          <div className="ambientEmptyPlaceholder" key={`${variant}-${index}`}>
            <div className="ambientEmptyPlaceholderMedia" />
            <div className="ambientEmptyPlaceholderBody">
              {lineClasses.map((lineClass, lineIndex) => (
                <span className={`ambientEmptyPlaceholderLine ${lineClass}`} key={`${variant}-${index}-${lineIndex}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ambientEmptyContent">
        <div className="ambientEmptyArtworkFrame" aria-hidden="true">
          <div className="ambientEmptyArtworkFallback">
            <div className="ambientEmptyArtworkOrb" />
          </div>
          {resolvedArtwork && !imageFailed ? (
            <img
              className="ambientEmptyArtworkImage"
              src={resolvedArtwork}
              alt={artworkAlt}
              onError={() => setImageFailed(true)}
            />
          ) : null}
        </div>

        {eyebrow ? <span className="ambientEmptyEyebrow">{eyebrow}</span> : null}
        <h3>{title}</h3>
        <p>{copy}</p>
        {actions ? <div className="ambientEmptyActions">{actions}</div> : null}
      </div>
    </section>
  );
}
