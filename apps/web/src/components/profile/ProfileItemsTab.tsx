import type { ReactNode } from "react";

import { NavLink } from "react-router-dom";

import { assetUrl } from "../../lib/presentation";
import type { ItemRecord } from "../../types";
import ProfileWorkspaceEmptyState from "./ProfileWorkspaceEmptyState";

type ProfileItemsTabProps = {
  items: ItemRecord[];
  view: string;
  emptyEyebrow?: string;
  emptyTitle: string;
  emptyCopy: string;
  emptyActions?: ReactNode;
  renderGridCard: (item: ItemRecord) => ReactNode;
};

export default function ProfileItemsTab({
  items,
  view,
  emptyEyebrow,
  emptyTitle,
  emptyCopy,
  emptyActions,
  renderGridCard
}: ProfileItemsTabProps) {
  if (items.length === 0) {
    return (
      <ProfileWorkspaceEmptyState
        eyebrow={emptyEyebrow}
        title={emptyTitle}
        copy={emptyCopy}
        actions={emptyActions}
      />
    );
  }

  return view === "list" ? (
    <div className="referenceList profileTabPanel">
      {items.map((item) => (
        <NavLink key={item.id} to={`/item/reef/${item.contractAddress}/${item.tokenId}`} className="referenceRow">
          <div className="collectionIdentity">
            <img src={assetUrl(item.imageUrl)} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.collectionName}</p>
            </div>
          </div>
          <span>{item.currentPriceDisplay}</span>
        </NavLink>
      ))}
    </div>
  ) : (
    <div className="itemGrid profileTabPanel">
      {items.map((item) => renderGridCard(item))}
    </div>
  );
}
