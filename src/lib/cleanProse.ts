/**
 * Clean Prose — strips markdown formatting from AI messages.
 * Ensures plain text output with simple line breaks only.
 */
export function cleanProse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")     // Remove **bold**
    .replace(/__(.*?)__/g, "$1")          // Remove __bold__
    .replace(/\*(.*?)\*/g, "$1")          // Remove *italic*
    .replace(/_(.*?)_/g, "$1")            // Remove _italic_
    .replace(/^#{1,6}\s+/gm, "")         // Remove # headings
    .replace(/^[\s]*[-*•]\s+/gm, "")     // Remove bullet points  
    .replace(/^[\s]*\d+\.\s+/gm, "")     // Remove numbered lists
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, "")) // Remove code backticks
    .replace(/\n{3,}/g, "\n\n")           // Collapse excessive newlines
    .trim();
}
