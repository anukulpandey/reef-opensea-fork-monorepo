import { NavLink } from "react-router-dom";
import { assetUrl, themeStyle } from "../../lib/presentation";
import type { CollectionSummary } from "../../types";

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function hasDistinctAvatar(collection: CollectionSummary) {
  return Boolean(collection.avatarUrl && collection.avatarUrl !== collection.bannerUrl);
}

export default function FeaturedCollectionCard({ collection }: { collection: CollectionSummary }) {
  const showAvatar = hasDistinctAvatar(collection);

  return (
    <NavLink
      to={`/collection/${collection.slug}`}
      className="featuredCollectionCard"
      style={themeStyle(collection.theme)}
    >
      <div className="featuredCollectionMedia">
        <img
          className="featuredCollectionBackdrop"
          src={assetUrl(collection.bannerUrl)}
          alt={collection.name}
        />
        <div className="featuredCollectionShade" />
        <div className="featuredCollectionHeader">
          <span className="featuredCollectionPill">Featured collection</span>
          <span className="featuredCollectionChain">{collection.chain}</span>
        </div>
        <div className="featuredCollectionHeroCopy">
          <small>{collection.category}</small>
          <h3>{collection.name}</h3>
          <p>{collection.description || `Live creator collection by ${collection.creatorName}`}</p>
        </div>
      </div>

      <div className="featuredCollectionBody">
        <div className="featuredCollectionIdentity">
          {showAvatar ? (
            <img
              className="featuredCollectionAvatar"
              src={assetUrl(collection.avatarUrl)}
              alt={collection.name}
            />
          ) : (
            <div className="featuredCollectionFallbackAvatar" aria-hidden="true">
              {initials(collection.name)}
            </div>
          )}
          <div className="featuredCollectionIdentityText">
            <span className="featuredCollectionEyebrow">By {collection.creatorName}</span>
            <strong>{collection.name}</strong>
            <p>{collection.items} items · {collection.owners} owners</p>
          </div>
        </div>

        <div className="featuredCollectionStats">
          <div className="featuredCollectionStat">
            <span>Floor</span>
            <strong>{collection.floorDisplay}</strong>
          </div>
          <div className="featuredCollectionStat">
            <span>1D</span>
            <strong className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
              {collection.tableMetrics.change}
            </strong>
          </div>
          <div className="featuredCollectionStat">
            <span>Volume</span>
            <strong>{collection.volumeDisplay}</strong>
          </div>
        </div>
      </div>
    </NavLink>
  );
}
