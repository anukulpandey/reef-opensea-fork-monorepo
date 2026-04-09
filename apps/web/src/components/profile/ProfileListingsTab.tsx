import type { ReactNode } from "react";

import AmbientEmptyState from "../AmbientEmptyState";
import type { ItemRecord } from "../../types";

type ProfileListingsTabProps = {
  items: ItemRecord[];
  renderGridCard: (item: ItemRecord) => ReactNode;
};

export default function ProfileListingsTab({ items, renderGridCard }: ProfileListingsTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      {items.length === 0 ? (
        <AmbientEmptyState
          compact
          variant="cards"
          eyebrow="Listings"
          title="No active listings found"
          copy="When NFTs from this wallet go live on the marketplace, they will show up here."
        />
      ) : null}
      {items.length > 0 ? <div className="itemGrid">{items.map((item) => renderGridCard(item))}</div> : null}
    </section>
  );
}
