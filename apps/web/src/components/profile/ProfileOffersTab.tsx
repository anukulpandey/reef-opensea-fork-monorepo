import type { ProfileOfferRecord } from "../../types";

type ProfileOffersTabProps = {
  offers: ProfileOfferRecord[];
};

export default function ProfileOffersTab({ offers }: ProfileOffersTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      <div className="profileOfferTable">
        {offers.length === 0 ? <p className="panelBody">No live offers found for this wallet.</p> : null}
        {offers.map((offer) => (
          <article className="profileOfferRow" key={offer.id}>
            <div>
              <strong>{offer.itemName}</strong>
              <p>{offer.collectionName}</p>
            </div>
            <span>{offer.direction}</span>
            <span>{offer.priceDisplay}</span>
            <span>{offer.status}</span>
            <span>{offer.expiresIn}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
