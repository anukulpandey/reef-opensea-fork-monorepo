import { assetUrl } from "../lib/presentation";
import { buildAvatarArt } from "../lib/identity";

type UserAvatarProps = {
  address: string;
  displayName?: string;
  src?: string;
  className?: string;
  alt?: string;
};

function shouldUseProvidedAvatar(src?: string) {
  const value = src?.trim();
  if (!value) {
    return false;
  }
  return !value.startsWith("data:image/svg+xml");
}

export default function UserAvatar({
  address,
  displayName,
  src,
  className,
  alt
}: UserAvatarProps) {
  const label = displayName?.trim() || address;
  const provided = src?.trim();
  const usesProvidedAvatar = Boolean(provided && shouldUseProvidedAvatar(provided));
  const resolved = usesProvidedAvatar ? assetUrl(provided as string) : buildAvatarArt(address, label);
  const classes = [className ?? "userAvatar", usesProvidedAvatar ? "" : "identiconAvatar"].filter(Boolean).join(" ");

  return (
    <span className={classes} title={label} aria-label={alt ?? label}>
      <img src={resolved} alt={alt ?? label} />
    </span>
  );
}
