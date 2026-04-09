import { NavLink } from "react-router-dom";

import AmbientEmptyState from "../AmbientEmptyState";
import { assetUrl } from "../../lib/presentation";
import type { CollectionSummary } from "../../types";

type ProfileCreatedTabProps = {
  collections: CollectionSummary[];
  isOwnProfile: boolean;
  emptyArtwork: string;
  onCreateCollection: () => void;
};

export default function ProfileCreatedTab({
  collections,
  isOwnProfile,
  emptyArtwork,
  onCreateCollection
}: ProfileCreatedTabProps) {
  if (collections.length === 0) {
    return (
      <AmbientEmptyState
        className="profileTabPanel"
        variant="table"
        artwork={emptyArtwork}
        eyebrow="Created"
        title={isOwnProfile ? "Start creating" : "No collections found"}
        copy={
          isOwnProfile
            ? "Create a collection, then publish NFTs into it from the Reef creator flow."
            : "This profile has not created any collections yet."
        }
        actions={
          isOwnProfile ? (
            <button className="actionButton secondary profileEmptyAction" type="button" onClick={onCreateCollection}>
              Create a collection
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <section className="tableSurface profileTabPanel">
      <div className="collectionTableHeader">
        <span />
        <span>Collection</span>
        <span>Floor Price</span>
        <span>1D Change</span>
        <span>Top Offer</span>
        <span>1D Vol</span>
        <span>1D Sales</span>
        <span>Owners</span>
      </div>
      {collections.map((collection) => (
        <NavLink to={`/collection/${collection.slug}`} className="collectionTableRow" key={collection.slug}>
          <span className="starSlot" />
          <div className="collectionIdentity">
            <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
            <div>
              <strong>{collection.name}</strong>
              {collection.badgeText ? <span className="miniBadge">{collection.badgeText}</span> : null}
            </div>
          </div>
          <span>{collection.tableMetrics.floor}</span>
          <span className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
            {collection.tableMetrics.change}
          </span>
          <span>{collection.tableMetrics.topOffer}</span>
          <span>{collection.tableMetrics.volume}</span>
          <span>{collection.tableMetrics.sales}</span>
          <span>{collection.tableMetrics.owners}</span>
        </NavLink>
      ))}
    </section>
  );
}
