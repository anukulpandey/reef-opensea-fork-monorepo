import { NavLink } from "react-router-dom";
import { assetUrl, themeStyle } from "../../lib/presentation";
import type { CollectionSummary } from "../../types";

export default function FeaturedCollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <NavLink
      to={`/collection/${collection.slug}`}
      className="featuredCollectionCard"
      style={themeStyle(collection.theme)}
    >
      <img
        className="featuredCollectionBackdrop"
        src={assetUrl(collection.bannerUrl)}
        alt={collection.name}
      />
      <div className="featuredCollectionShade" />
      <div className="featuredCollectionAmbientGlow" aria-hidden="true" />
      <div className="featuredCollectionBadgeRow">
        <span className="featuredCollectionChain">{collection.chain}</span>
        <span className="featuredCollectionCategory">{collection.category}</span>
      </div>
      <div className="featuredCollectionOverlay">
        <div className="featuredCollectionCopy">
          <div className="featuredCollectionTitleRow">
            <h3>{collection.name}</h3>
            {collection.verified ? <span className="featuredCollectionVerified" aria-label="Verified">✓</span> : null}
          </div>
          <p>By {collection.creatorName}</p>
        </div>
        <div className="featuredCollectionGlass">
          <div className="featuredCollectionMetric">
            <span>Floor price</span>
            <strong>{collection.floorDisplay}</strong>
          </div>
          <div className="featuredCollectionMetric">
            <span>Items</span>
            <strong>{collection.items.toLocaleString()}</strong>
          </div>
          <div className="featuredCollectionMetric">
            <span>Total volume</span>
            <strong>{collection.volumeDisplay}</strong>
          </div>
          <div className="featuredCollectionMetric accent">
            <span>Listed</span>
            <strong>{collection.listedPercent}%</strong>
          </div>
        </div>
      </div>
    </NavLink>
  );
}
