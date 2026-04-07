import { assetUrl } from "../../lib/presentation";
import type { ProfileTokenHolding } from "../../types";

type ProfileTokensTabProps = {
  tokens: ProfileTokenHolding[];
};

export default function ProfileTokensTab({ tokens }: ProfileTokensTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      <div className="profileTokenTable">
        {tokens.length === 0 ? <p className="panelBody">No tracked token balances found.</p> : null}
        {tokens.map((token) => (
          <article className="profileTokenRow" key={token.id}>
            <div className="collectionIdentity">
              <img src={assetUrl(token.iconUrl)} alt={token.symbol} />
              <div>
                <strong>{token.name}</strong>
                <p>{token.symbol}</p>
              </div>
            </div>
            <span>{token.balanceDisplay}</span>
            <span>{token.valueDisplay}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
