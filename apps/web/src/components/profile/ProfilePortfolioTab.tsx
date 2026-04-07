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
    <section className="pagePanel profileTabPanel">
      <div className="profilePortfolioGrid">
        {portfolio.summaryCards.map((card) => (
          <article className="profilePortfolioCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </div>
      <div className="profilePortfolioSplit">
        <article className="profilePortfolioPanel">
          <h3>Tracked tokens</h3>
          {tokens.length === 0 ? <p>No token balances to show.</p> : null}
          {tokens.map((token) => (
            <div className="profilePortfolioRow" key={token.id}>
              <span>{token.symbol}</span>
              <strong>{token.balanceDisplay}</strong>
            </div>
          ))}
        </article>
        <article className="profilePortfolioPanel">
          <h3>Collection exposure</h3>
          {galleries.length === 0 ? <p>No NFT collections in this wallet yet.</p> : null}
          {galleries.map((gallery) => (
            <div className="profilePortfolioRow" key={gallery.id}>
              <span>{gallery.collectionName}</span>
              <strong>{gallery.itemCount} items</strong>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
