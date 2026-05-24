/**
 * Generate a v4 UUID in uppercase hex.
 * Matches v2 behavior exactly (Math.random()-based, uppercase).
 * Used when crypto.randomUUID is unavailable or for parity with v2.
 */
export function generateRandomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}
