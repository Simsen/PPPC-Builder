/** Escape XML special characters in text content (matches v2 behavior: only & < >). */
export function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
