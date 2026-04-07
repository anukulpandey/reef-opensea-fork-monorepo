import { NavLink } from "react-router-dom";

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
      <section className="profileCreatedBoard profileTabPanel">
        <div className="collectionTableHeader collectionTableGhost">
          <span />
          <span>Collection</span>
          <span>Floor Price</span>
          <span>Vol</span>
          <span>Sales</span>
          <span>Owners</span>
          <span>Supply</span>
          <span>Last</span>
        </div>
        {[0, 1, 2, 3].map((index) => (
          <div className="collectionTableRow collectionTableGhost" key={`ghost-${index}`}>
            <span className="starSlot" />
            <div className="collectionIdentity">
              <span className="ghostAvatar" />
              <div className="ghostStack">
                <span className="ghostBar medium" />
                <span className="ghostBar short" />
              </div>
            </div>
            <span className="ghostBar short" />
            <span className="ghostBar short" />
            <span className="ghostBar short" />
            <span className="ghostBar short" />
            <span className="ghostBar short" />
            <span className="ghostBar short" />
          </div>
        ))}
        <div className={isOwnProfile ? "profileEmptyMessage hasAction" : "profileEmptyMessage"}>
          <img src={emptyArtwork} alt="" />
          <h2>{isOwnProfile ? "Start creating" : "No collections found"}</h2>
          <p>
            {isOwnProfile
              ? "Create an NFT collection on OpenSea."
              : "This profile has not created any collections yet."}
          </p>
          {isOwnProfile ? (
            <button className="actionButton secondary profileEmptyAction" type="button" onClick={onCreateCollection}>
              Create a collection
            </button>
          ) : null}
        </div>
      </section>
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
