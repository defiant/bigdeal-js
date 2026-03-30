const RMD_BYTES = 20;

/**
 * Get cryptographically secure random bytes.
 * Works in both Node.js and browsers.
 */
export function getRandomBytes(n: number = RMD_BYTES): Uint8Array {
  const buf = new Uint8Array(n);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    throw new Error('No secure random source available');
  }

  return buf;
}
