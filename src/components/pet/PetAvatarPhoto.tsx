type PetAvatarPhotoProps = {
  name: string;
  src: string;
  onActivate?: () => void;
};

/** The photo the dashboard already showed, used whenever the canvas cannot run. */
export const PetAvatarPhoto = ({ name, src, onActivate }: PetAvatarPhotoProps) => (
  <button
    type="button"
    onClick={onActivate}
    aria-label={`הדמות של ${name}`}
    data-pet-avatar="photo"
    className="relative h-[240px] w-[240px] overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mipo-violet dark:border-mipo-surface"
  >
    <img src={src} alt="" className="h-full w-full object-cover" />
  </button>
);
