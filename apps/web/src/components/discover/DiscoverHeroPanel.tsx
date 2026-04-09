import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { assetUrl, themeStyle } from "../../lib/presentation";
import type { CollectionSummary } from "../../types";

const AUTO_ADVANCE_MS = 3600;

type DiscoverHeroPanelProps = {
  heroCollections: CollectionSummary[];
  onCreateCollection: () => void;
  onLaunchNft: () => void;
  onOpenStudio: () => void;
};

export default function DiscoverHeroPanel({
  heroCollections,
  onCreateCollection,
  onLaunchNft,
  onOpenStudio
}: DiscoverHeroPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasHero = heroCollections.length > 0;
  const heroCollection = hasHero ? heroCollections[activeIndex] ?? heroCollections[0] ?? null : null;
  const slideKey = heroCollections.map((collection) => collection.slug).join("|");
  const heroTheme = themeStyle(
    heroCollection?.theme ?? {
      accent: "#2081e2",
      accentSoft: "rgba(32,129,226,0.16)",
      heroBackground: "#10161f",
      panelSurface: "#16181b",
      textOnHero: "#f8fafc"
    }
  ) as CSSProperties;
  const heroStyle = {
    ...heroTheme,
    "--carousel-duration": `${AUTO_ADVANCE_MS}ms`
  } as CSSProperties;

  useEffect(() => {
    setActiveIndex(0);
  }, [slideKey]);

  useEffect(() => {
    if (heroCollections.length <= 1 || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroCollections.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [heroCollections.length, isPaused]);

  return (
    <section
      className="heroSurface"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={heroStyle}
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
      <div className={isPaused ? "carouselDots paused" : "carouselDots"}>
        {(hasHero ? heroCollections : Array.from({ length: 1 })).map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === activeIndex ? "dot active" : "dot"}
            aria-label={`Show slide ${index + 1}`}
            onClick={() => setActiveIndex(index)}
          >
            <span className="dotProgress" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
