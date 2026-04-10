import type { ReactNode } from "react";

import { NavLink } from "react-router-dom";

import { assetUrl } from "../../lib/presentation";
import type { ItemRecord } from "../../types";
import ProfileWorkspaceEmptyState from "./ProfileWorkspaceEmptyState";

type ProfileListingsTabProps = {
  items: ItemRecord[];
  view: string;
  emptyActions?: ReactNode;
  renderGridCard: (item: ItemRecord) => ReactNode;
};

export default function ProfileListingsTab({ items, view, emptyActions, renderGridCard }: ProfileListingsTabProps) {
  if (items.length === 0) {
    return (
      <ProfileWorkspaceEmptyState
        eyebrow="Listings"
        title="No active listings found"
        copy="When NFTs from this wallet go live on the marketplace, they will show up here."
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
    <div className="itemGrid profileTabPanel">{items.map((item) => renderGridCard(item))}</div>
  );
}
