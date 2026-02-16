// PBKDF2-SHA256 password hashing using Web Crypto API
// Compatible with Cloudflare Workers (no Node.js crypto needed)

const ITERATIONS = 100_000;
const SALT_LENGTH = 16; // bytes
const HASH_LENGTH = 32; // bytes
const ALGORITHM = 'PBKDF2';
const HASH_ALGO = 'SHA-256';
const PREFIX = 'pbkdf2';

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Hash a password with a random salt using PBKDF2-SHA256.
 * Returns format: `pbkdf2:100000:base64salt:base64hash`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, salt, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    HASH_LENGTH * 8,
  );

  const hash = new Uint8Array(derivedBits);
  return `${PREFIX}:${ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

/**
 * Verify a password against a stored hash.
 * Supports PBKDF2 format (`pbkdf2:...`) and legacy plaintext (for migration).
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // PBKDF2 format: pbkdf2:iterations:base64salt:base64hash
  if (stored.startsWith(`${PREFIX}:`)) {
    const parts = stored.split(':');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const salt = fromBase64(parts[2]);
    const expectedHash = fromBase64(parts[3]);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      ALGORITHM,
      false,
      ['deriveBits'],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      { name: ALGORITHM, salt, iterations, hash: HASH_ALGO },
      keyMaterial,
      expectedHash.length * 8,
    );

    const computedHash = new Uint8Array(derivedBits);

    // Timing-safe comparison
    if (computedHash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
      diff |= computedHash[i] ^ expectedHash[i];
    }
    return diff === 0;
  }

  // Legacy plaintext fallback (for existing users before migration)
  return password === stored;
}
