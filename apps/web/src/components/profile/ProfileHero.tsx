import type { ReactNode } from "react";

import { assetUrl } from "../../lib/presentation";
import type { ProfileSummary } from "../../types";

type ProfileHeroProps = {
  profile: ProfileSummary;
  profileLabel: string;
  profileTag: string;
  usdValue: string;
  nftPercent: string;
  tokenPercent: string;
  titleActions?: ReactNode;
  statAction?: ReactNode;
};

export default function ProfileHero({
  profile,
  profileLabel,
  profileTag,
  usdValue,
  nftPercent,
  tokenPercent,
  titleActions,
  statAction
}: ProfileHeroProps) {
  return (
    <section className="profileHeroSurface">
      <img className="profileHeroBanner" src={assetUrl(profile.bannerUrl)} alt={profile.name} />
      <div className="profileHeroShade" />
      <div className="profileHeroInner">
        <div className="profileHeroIdentity">
          <img className="profileHeroAvatar" src={assetUrl(profile.avatarUrl)} alt={profile.name} />
          <div className="profileTitleBlock">
            <div className="profileTitleRow">
              <h1>{profileLabel}</h1>
              {titleActions}
            </div>
            <span className="profileTag">{profileTag}</span>
            <p>{profile.bio}</p>
          </div>
        </div>

        <div className="profileHeroStats">
          <article>
            <span>Portfolio</span>
            <strong>{usdValue}</strong>
          </article>
          <article>
            <span>NFTs</span>
            <strong>{nftPercent}</strong>
          </article>
          <article>
            <span>Tokens</span>
            <strong>{tokenPercent}</strong>
          </article>
          {statAction}
        </div>
      </div>
    </section>
  );
}
