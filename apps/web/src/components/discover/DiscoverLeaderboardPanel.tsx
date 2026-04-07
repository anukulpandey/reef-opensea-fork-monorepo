import { NavLink } from "react-router-dom";
import { assetUrl } from "../../lib/presentation";
import type { CollectionSummary, TokenRecord } from "../../types";

type DiscoverLeaderboardPanelProps = {
  selectedAsset: "nfts" | "tokens";
  tokenLeaders: TokenRecord[];
  leaderboardCollections: CollectionSummary[];
};

export default function DiscoverLeaderboardPanel({
  selectedAsset,
  tokenLeaders,
  leaderboardCollections
}: DiscoverLeaderboardPanelProps) {
  return (
    <aside className="leaderSurface">
      <div className="leaderHeader">
        <span>{selectedAsset === "tokens" ? "Token" : "Collection"}</span>
        <span>{selectedAsset === "tokens" ? "Price" : "Floor"}</span>
      </div>
      {selectedAsset === "tokens" ? (
        tokenLeaders.length === 0 ? (
          <div className="emptyShellState compact">
            <p>No tokens to display.</p>
          </div>
        ) : (
          tokenLeaders.map((token) => (
            <article className="leaderRow" key={token.slug}>
              <div className="leaderIdentity">
                <img src={assetUrl(token.iconUrl)} alt={token.name} />
                <div>
                  <strong>{token.name}</strong>
                </div>
              </div>
              <div className="leaderMetrics">
                <strong>{token.price}</strong>
                <span className={token.change.startsWith("-") ? "negative" : "positive"}>
                  {token.change}
                </span>
              </div>
            </article>
          ))
        )
      ) : leaderboardCollections.length === 0 ? (
        <div className="emptyShellState compact">
          <p>No live collections to display yet.</p>
        </div>
      ) : (
        leaderboardCollections.map((collection) => (
          <NavLink to={`/collection/${collection.slug}`} className="leaderRow" key={collection.slug}>
            <div className="leaderIdentity">
              <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
              <div>
                <strong>{collection.name}</strong>
              </div>
            </div>
            <div className="leaderMetrics">
              <strong>{collection.tableMetrics.floor}</strong>
              <span className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
                {collection.tableMetrics.change}
              </span>
            </div>
          </NavLink>
        ))
      )}
    </aside>
  );
}
