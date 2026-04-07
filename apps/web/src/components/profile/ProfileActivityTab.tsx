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

type ProfileActivityTabProps = {
  activity: ActivityRecord[];
};

export default function ProfileActivityTab({ activity }: ProfileActivityTabProps) {
  return (
    <section className="pagePanel profileTabPanel">
      <div className="activityTable">
        {activity.length === 0 ? <p className="panelBody">No wallet activity found.</p> : null}
        {activity.map((entry) => (
          <div className="activityTableRow" key={entry.id}>
            <div>
              <strong>{entry.itemName}</strong>
              <p>{entry.collectionName ?? entry.collectionSlug}</p>
            </div>
            <span>{formatActivityTypeLabel(entry.type)}</span>
            <span>{entry.from}</span>
            <span>{entry.to}</span>
            <span>{entry.priceDisplay}</span>
            <span>{entry.ageLabel}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
