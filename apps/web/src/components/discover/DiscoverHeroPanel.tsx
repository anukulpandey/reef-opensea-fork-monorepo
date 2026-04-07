import { assetUrl, themeStyle } from "../../lib/presentation";
import type { CollectionSummary } from "../../types";

type DiscoverHeroPanelProps = {
  heroCollection: CollectionSummary | null;
  onCreateCollection: () => void;
  onLaunchNft: () => void;
  onOpenStudio: () => void;
};

export default function DiscoverHeroPanel({
  heroCollection,
  onCreateCollection,
  onLaunchNft,
  onOpenStudio
}: DiscoverHeroPanelProps) {
  const hasHero = Boolean(heroCollection);

  return (
    <section
      className="heroSurface"
      style={themeStyle(
        heroCollection?.theme ?? {
          accent: "#2081e2",
          accentSoft: "rgba(32,129,226,0.16)",
          heroBackground: "#10161f",
          panelSurface: "#16181b",
          textOnHero: "#f8fafc"
        }
      )}
    >
      {hasHero && heroCollection ? (
        <>
          <img
            className="heroImage"
            src={assetUrl(heroCollection.hero.backgroundUrl)}
            alt={heroCollection.name}
          />
          <div className="heroOverlay">
            <div>
              <h1>{heroCollection.name}</h1>
              <p>{heroCollection.hero.subtitle}</p>
            </div>
            <div className="heroMetrics overlay">
              {heroCollection.hero.metrics.map((metric) => (
                <article key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="emptyShellState heroEmptyState discoverHeroEmpty">
          <div>
            <h2>Launch your first collection</h2>
            <p>Ready creator collections on Reef appear here automatically once they are live.</p>
            <div className="discoverEmptyActions">
              <button className="actionButton primary" type="button" onClick={onCreateCollection}>
                Create collection
              </button>
              <button className="actionButton secondary" type="button" onClick={onLaunchNft}>
                Launch NFT
              </button>
              <button className="actionButton muted" type="button" onClick={onOpenStudio}>
                Open Studio
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="carouselDots">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index === 0 ? "dot active" : "dot"} />
        ))}
      </div>
    </section>
  );
}
