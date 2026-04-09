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
              <span className="profileTitleDivider" aria-hidden="true" />
              {titleActions}
            </div>
            <div className="profileHeroMeta">
              <span className="profileTag">{profileTag}</span>
            </div>
            {profile.bio ? <p className="profileHeroBio">{profile.bio}</p> : null}
          </div>
        </div>

        <div className="profileHeroStats">
          <article>
            <span>USD Value</span>
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
