/**
 * autoSaveUpload — Automatically saves uploaded content to the user's album (pet_photos)
 * or documents (pet_documents) based on content type.
 * Call this after any successful upload across the app.
 */

import { supabase } from "@/integrations/supabase/client";

interface AutoSaveMediaParams {
  userId: string;
  petId?: string | null;
  mediaUrl: string;
  caption?: string | null;
  mediaType: "image" | "video";
}

interface AutoSaveDocumentParams {
  userId: string;
  petId?: string | null;
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  documentType?: string;
  title?: string;
  description?: string | null;
}

/**
 * Save a photo or video to pet_photos (album)
 */
export async function autoSaveToAlbum({
  userId,
  petId,
  mediaUrl,
  caption,
}: AutoSaveMediaParams) {
  try {
    await supabase.from("pet_photos").insert({
      user_id: userId,
      pet_id: petId || null,
      photo_url: mediaUrl,
      caption: caption || null,
    });
  } catch (err) {
    console.error("autoSaveToAlbum error:", err);
  }
}

/**
 * Save a document to pet_documents
 */
export async function autoSaveToDocuments({
  userId,
  petId,
  fileUrl,
  fileName,
  fileSize,
  documentType = "general",
  title,
  description,
}: AutoSaveDocumentParams) {
  try {
    if (!petId) return; // pet_documents requires pet_id (NOT NULL)
    await supabase.from("pet_documents").insert({
      user_id: userId,
      pet_id: petId,
      document_type: documentType,
      title: title || fileName,
      description: description || null,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize || null,
    });
  } catch (err) {
    console.error("autoSaveToDocuments error:", err);
  }
}
