import type { ReactNode } from "react";

import { NavLink } from "react-router-dom";

import AmbientEmptyState from "../AmbientEmptyState";
import { assetUrl } from "../../lib/presentation";
import type { ItemRecord } from "../../types";

type ProfileItemsTabProps = {
  items: ItemRecord[];
  view: string;
  emptyArtwork: string;
  emptyTitle: string;
  emptyCopy: string;
  renderGridCard: (item: ItemRecord) => ReactNode;
};

export default function ProfileItemsTab({
  items,
  view,
  emptyArtwork,
  emptyTitle,
  emptyCopy,
  renderGridCard
}: ProfileItemsTabProps) {
  if (items.length === 0) {
    return (
      <AmbientEmptyState
        className="profileTabPanel"
        variant="cards"
        artwork={emptyArtwork}
        title={emptyTitle}
        copy={emptyCopy}
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
