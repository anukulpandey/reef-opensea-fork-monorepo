import type { ReactNode } from "react";

import type { ItemRecord } from "../../types";

type ProfileListingsTabProps = {
  items: ItemRecord[];
  renderGridCard: (item: ItemRecord) => ReactNode;
};

export default function ProfileListingsTab({ items, renderGridCard }: ProfileListingsTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      {items.length === 0 ? <p className="panelBody">No active listings found.</p> : null}
      {items.length > 0 ? <div className="itemGrid">{items.map((item) => renderGridCard(item))}</div> : null}
    </section>
  );
}
