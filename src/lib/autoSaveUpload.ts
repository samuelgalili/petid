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

export async function autoSaveToAlbum(_params: AutoSaveMediaParams) {
  // Album persistence is not AWS-backed yet.
}

export async function autoSaveToDocuments(_params: AutoSaveDocumentParams) {
  // Document persistence should use createMyDocument where the File object exists.
}
