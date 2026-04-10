import type { ReactNode } from "react";

import { assetUrl } from "../../lib/presentation";
import type { ProfileSummary } from "../../types";
import UserAvatar from "../UserAvatar";

type ProfileHeroProps = {
  profile: ProfileSummary;
  profileAddress?: string;
  profileLabel: string;
  profileTag: string;
  usdValue: string;
  nftPercent: string;
  tokenPercent: string;
  titleActions?: ReactNode;
  statAction?: ReactNode;
  avatarSrc?: string;
};

export default function ProfileHero({
  profile,
  profileAddress,
  profileLabel,
  profileTag,
  usdValue,
  nftPercent,
  tokenPercent,
  titleActions,
  statAction,
  avatarSrc
}: ProfileHeroProps) {
  return (
    <section className="profileHeroSurface">
      <img className="profileHeroBanner" src={assetUrl(profile.bannerUrl)} alt={profile.name} />
      <div className="profileHeroShade" />
      <div className="profileHeroInner">
        <div className="profileHeroIdentity">
          <UserAvatar
            address={profileAddress || profile.slug || profile.name}
            displayName={profileLabel}
            src={avatarSrc ?? profile.avatarUrl}
            className="userAvatar profileHeroAvatar"
            alt={profileLabel}
          />
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
