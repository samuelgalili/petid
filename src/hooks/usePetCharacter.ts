import { useCallback, useEffect, useState } from "react";

import {
  createMyPetCharacter,
  deleteMyPetCharacter,
  getMyPetCharacter,
  selectMyPetCharacterCandidate,
  type MipoPetCharacter,
} from "@/lib/mipoApi";

const isGenerating = (character: MipoPetCharacter | null) => (
  character?.status === "generating_candidates" || character?.status === "generating_pack"
);

export const usePetCharacter = (petId: string | null | undefined) => {
  const [character, setCharacter] = useState<MipoPetCharacter | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(Boolean(petId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!petId) {
      setCharacter(null);
      setLoading(false);
      return null;
    }
    if (!silent) setLoading(true);
    try {
      const result = await getMyPetCharacter(petId);
      setAvailable(result.available);
      setCharacter(result.character);
      setError(null);
      return result.character;
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "לא הצלחנו לטעון את הדמות");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    setCharacter(null);
    setError(null);
    void refresh();
    const handleChange = () => void refresh(true);
    window.addEventListener("mipo:pet-character-changed", handleChange);
    return () => window.removeEventListener("mipo:pet-character-changed", handleChange);
  }, [refresh]);

  useEffect(() => {
    if (!isGenerating(character)) return;
    const timer = window.setInterval(() => void refresh(true), 2500);
    return () => window.clearInterval(timer);
  }, [character, refresh]);

  const generate = useCallback(async (photos: File[]) => {
    if (!petId) return null;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createMyPetCharacter(petId, photos);
      setAvailable(result.available);
      setCharacter(result.character);
      return result.character;
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "יצירת הדמות נכשלה");
      throw generateError;
    } finally {
      setSubmitting(false);
    }
  }, [petId]);

  const selectCandidate = useCallback(async (candidateKey: string) => {
    if (!petId) return null;
    setSubmitting(true);
    setError(null);
    try {
      const result = await selectMyPetCharacterCandidate(petId, candidateKey);
      setCharacter(result.character);
      return result.character;
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : "בחירת הדמות נכשלה");
      throw selectionError;
    } finally {
      setSubmitting(false);
    }
  }, [petId]);

  const remove = useCallback(async () => {
    if (!petId) return false;
    setSubmitting(true);
    setError(null);
    try {
      const deleted = await deleteMyPetCharacter(petId);
      if (deleted) setCharacter(null);
      return deleted;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "מחיקת הדמות נכשלה");
      throw deleteError;
    } finally {
      setSubmitting(false);
    }
  }, [petId]);

  return {
    character,
    available,
    loading,
    submitting,
    error,
    refresh,
    generate,
    selectCandidate,
    remove,
  };
};
