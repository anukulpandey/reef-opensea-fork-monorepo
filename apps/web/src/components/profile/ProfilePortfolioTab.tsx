import type { ProfileGalleryRecord, ProfilePortfolioSummary, ProfileTokenHolding } from "../../types";

type ProfilePortfolioTabProps = {
  portfolio: ProfilePortfolioSummary;
  tokens: ProfileTokenHolding[];
  galleries: ProfileGalleryRecord[];
};

export default function ProfilePortfolioTab({
  portfolio,
  tokens,
  galleries
}: ProfilePortfolioTabProps) {
  return (
    <section className="pagePanel profileTabPanel profilePortfolioShell">
      <div className="profilePortfolioOverview" role="list">
        {portfolio.summaryCards.map((card) => (
          <article className="profilePortfolioMetric" key={card.label} role="listitem">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </div>
      <div className="profilePortfolioTables">
        <article className="profilePortfolioSection">
          <div className="profilePortfolioSectionHeader">
            <h3>Tracked tokens</h3>
            <span>{tokens.length} assets</span>
          </div>
          <div className="profilePortfolioTableHeader">
            <span>Asset</span>
            <span>Balance</span>
          </div>
          {tokens.length === 0 ? (
            <div className="profilePortfolioEmpty">
              <strong>No token balances yet</strong>
              <p>Tracked wallet balances will appear here as soon as they exist.</p>
            </div>
          ) : null}
          {tokens.map((token) => (
            <div className="profilePortfolioRow" key={token.id}>
              <div className="profilePortfolioIdentity">
                <strong>{token.symbol}</strong>
                <span>{token.name}</span>
              </div>
              <strong>{token.balanceDisplay}</strong>
            </div>
          ))}
        </article>
        <article className="profilePortfolioSection">
          <div className="profilePortfolioSectionHeader">
            <h3>Collection exposure</h3>
            <span>{galleries.length} collections</span>
          </div>
          <div className="profilePortfolioTableHeader">
            <span>Collection</span>
            <span>Exposure</span>
          </div>
          {galleries.length === 0 ? (
            <div className="profilePortfolioEmpty">
              <strong>No NFT collections yet</strong>
              <p>Collection exposure updates here once this wallet owns NFTs.</p>
            </div>
          ) : null}
          {galleries.map((gallery) => (
            <div className="profilePortfolioRow" key={gallery.id}>
              <div className="profilePortfolioIdentity">
                <strong>{gallery.collectionName}</strong>
                <span>{gallery.creatorName}</span>
              </div>
              <strong>{gallery.itemCount} items</strong>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
