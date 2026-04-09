import { NavLink } from "react-router-dom";

import AmbientEmptyState from "../AmbientEmptyState";
import { assetUrl } from "../../lib/presentation";
import type { ProfileGalleryRecord } from "../../types";

type ProfileGalleriesTabProps = {
  galleries: ProfileGalleryRecord[];
  emptyArtwork: string;
  isOwnProfile: boolean;
  onCreateCollection: () => void;
};

export default function ProfileGalleriesTab({
  galleries,
  emptyArtwork,
  isOwnProfile,
  onCreateCollection
}: ProfileGalleriesTabProps) {
  if (galleries.length === 0) {
    return (
      <AmbientEmptyState
        className="profileTabPanel"
        variant="cards"
        artwork={emptyArtwork}
        eyebrow="Galleries"
        title={isOwnProfile ? "Build your first gallery" : "No galleries found"}
        copy={
          isOwnProfile
            ? "Your NFTs will group into collection galleries automatically as you mint and collect."
            : "This profile does not have any collection galleries yet."
        }
        actions={
          isOwnProfile ? (
            <button className="actionButton secondary profileEmptyAction" type="button" onClick={onCreateCollection}>
              Create a collection
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <section className="profileGalleryGrid profileTabPanel">
      {galleries.map((gallery) => (
        <NavLink key={gallery.id} to={`/collection/${gallery.collectionSlug}`} className="profileGalleryCard">
          <div className="profileGalleryPreview">
            <img className="profileGalleryBanner" src={assetUrl(gallery.bannerUrl)} alt={gallery.collectionName} />
            <div className="profileGalleryThumbRow">
              {gallery.itemsPreview.slice(0, 3).map((item) => (
                <img key={item.id} className="profileGalleryThumb" src={assetUrl(item.imageUrl)} alt={item.name} />
              ))}
            </div>
          </div>
          <div className="profileGalleryMeta">
            <div>
              <strong>{gallery.collectionName}</strong>
              <p>{gallery.creatorName}</p>
            </div>
            <span>{gallery.floorDisplay}</span>
          </div>
          <div className="profileGalleryStats">
            <span>{gallery.itemCount} items</span>
            <span>{gallery.listedCount} listed</span>
          </div>
        </NavLink>
      ))}
    </section>
  );
}
