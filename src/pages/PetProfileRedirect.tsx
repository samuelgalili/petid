/**
 * PetProfileRedirect — Opens the PublicPetProfile overlay when navigating to /pet-profile/:petId.
 * Redirects to the main shell and triggers the overlay via context.
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOverlayNav } from "@/contexts/OverlayNavContext";

const PetProfileRedirect = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { openPublicPet } = useOverlayNav();

  useEffect(() => {
    if (petId) {
      openPublicPet(petId);
      // Navigate to feed so MainShell is mounted (which renders the overlay)
      navigate("/", { replace: true });
    }
  }, [petId, openPublicPet, navigate]);

  return null;
};

export default PetProfileRedirect;
