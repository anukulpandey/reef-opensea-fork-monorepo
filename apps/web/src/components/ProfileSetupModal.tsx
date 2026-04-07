import { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";

type ProfileSetupModalProps = {
  open: boolean;
  address: string;
  initialDisplayName?: string;
  initialBio?: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: { displayName: string; bio: string }) => Promise<unknown> | unknown;
};

export default function ProfileSetupModal({
  open,
  address,
  initialDisplayName = "",
  initialBio = "",
  saving = false,
  onClose,
  onSubmit
}: ProfileSetupModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDisplayName(initialDisplayName);
    setBio(initialBio);
  }, [open, initialBio, initialDisplayName]);

  if (!open) {
    return null;
  }

  return (
    <div className="profileSetupOverlay" role="presentation" onClick={() => !saving && onClose()}>
      <form
        className="profileSetupModal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({
            displayName: displayName.trim(),
            bio: bio.trim()
          });
        }}
      >
        <div className="profileSetupHeader">
          <div>
            <p className="eyebrow">Complete profile</p>
            <h2>Make your wallet feel like a real profile</h2>
            <p className="profileSetupCopy">
              Save a display name to Reef so the marketplace shows it everywhere instead of only the wallet address.
            </p>
          </div>
          <UserAvatar
            address={address}
            displayName={displayName || address}
            className="userAvatar profileSetupPreview"
          />
        </div>

        <label className="fieldStack">
          <span>Display name</span>
          <input
            className="shellInput"
            value={displayName}
            maxLength={120}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Enter your name"
          />
        </label>

        <label className="fieldStack">
          <span>Bio</span>
          <textarea
            className="shellTextarea"
            value={bio}
            maxLength={280}
            rows={4}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell collectors a little about yourself"
          />
        </label>

        <div className="profileSetupFooter">
          <button className="actionButton muted" type="button" disabled={saving} onClick={onClose}>
            Later
          </button>
          <button className="actionButton primary" type="submit" disabled={saving || !displayName.trim()}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
