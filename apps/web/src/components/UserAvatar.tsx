import { assetUrl } from "../lib/presentation";
import { buildAvatarArt } from "../lib/identity";

type UserAvatarProps = {
  address: string;
  displayName?: string;
  src?: string;
  className?: string;
  alt?: string;
};

export default function UserAvatar({
  address,
  displayName,
  src,
  className,
  alt
}: UserAvatarProps) {
  const label = displayName?.trim() || address;
  const resolved = src?.trim() ? assetUrl(src) : buildAvatarArt(address, label);

  return (
    <span className={className ?? "userAvatar"} title={label} aria-label={alt ?? label}>
      <img src={resolved} alt={alt ?? label} />
    </span>
  );
}
