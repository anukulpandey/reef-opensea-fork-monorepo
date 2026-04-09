import { NavLink } from "react-router-dom";

import AmbientEmptyState from "../AmbientEmptyState";
import type { ActivityRecord } from "../../types";

function formatActivityTypeLabel(type: string) {
  switch (type) {
    case "mint":
      return "Mint";
    case "listing":
      return "Listing";
    case "sale":
      return "Sale";
    case "offer":
      return "Offer";
    case "transfer":
      return "Transfer";
    case "create-collection":
      return "Create collection";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function formatActivitySummary(entry: ActivityRecord) {
  switch (entry.type) {
    case "listing":
      return "Listed on Reef marketplace";
    case "sale":
      return "Sale completed on Reef";
    case "mint":
      return "Minted into the connected wallet";
    case "transfer":
      return "Ownership moved between wallets";
    case "offer":
      return "Offer lifecycle event";
    case "create-collection":
      return entry.statusLabel ? `Collection deployment ${entry.statusLabel.toLowerCase()}` : "Collection deployment event";
    default:
      return "Marketplace event";
  }
}

function activityHref(entry: ActivityRecord) {
  if (entry.type === "create-collection") {
    return `/collection/${entry.collectionSlug}`;
  }
  if (entry.collectionAddress && entry.itemId) {
    return `/item/reef/${entry.collectionAddress}/${entry.itemId}`;
  }
  return null;
}

type ProfileActivityTabProps = {
  activity: ActivityRecord[];
};

export default function ProfileActivityTab({ activity }: ProfileActivityTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      <div className="profileActivityFeed">
        {activity.length === 0 ? (
          <AmbientEmptyState
            compact
            variant="rows"
            eyebrow="Activity"
            title="No wallet activity found"
            copy="Mint, list, sell, and transfer events connected to this profile will appear here."
          />
        ) : null}
        {activity.map((entry) => {
          const href = activityHref(entry);
          const content = (
            <>
              <div className="profileActivityCardTop">
                <div className="profileActivityHeadline">
                  <span className={`profileActivityTypePill activityType-${entry.type}`}>
                    {formatActivityTypeLabel(entry.type)}
                  </span>
                  <strong>{entry.itemName}</strong>
                  <p>{entry.collectionName ?? entry.collectionSlug}</p>
                </div>
                <div className="profileActivityValueBlock">
                  <span className="profileActivityAge">{entry.ageLabel}</span>
                  <strong>{entry.priceDisplay === "-" ? formatActivityTypeLabel(entry.type) : entry.priceDisplay}</strong>
                </div>
              </div>

              <div className="profileActivitySummary">
                <p>{formatActivitySummary(entry)}</p>
                {entry.statusLabel ? <span className="profileActivityStatus">{entry.statusLabel}</span> : null}
              </div>

              <div className="profileActivityParties">
                <div className="profileActivityParty">
                  <label>From</label>
                  <span>{entry.from}</span>
                </div>
                <div className="profileActivityPartyConnector">to</div>
                <div className="profileActivityParty">
                  <label>To</label>
                  <span>{entry.to}</span>
                </div>
              </div>
            </>
          );
          if (href) {
            return (
              <NavLink key={entry.id} to={href} className={`profileActivityCard activityTone-${entry.type}`}>
                {content}
              </NavLink>
            );
          }
          return (
            <article key={entry.id} className={`profileActivityCard activityTone-${entry.type}`}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
