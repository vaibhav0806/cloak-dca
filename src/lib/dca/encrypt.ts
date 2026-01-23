/**
 * Client-side encryption for DCA configurations
 * Uses Web Crypto API for secure encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derive an encryption key from a wallet signature
 * This ensures only the wallet owner can decrypt their DCA configs
 */
export async function deriveKeyFromSignature(signature: Uint8Array): Promise<CryptoKey> {
  // Use PBKDF2 to derive a strong key from the signature
  // Copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
  const signatureBuffer = new Uint8Array(signature).buffer;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signatureBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use a fixed salt for deterministic key derivation
  const saltArray = new TextEncoder().encode('stealth-dca-v1');
  const salt = new Uint8Array(saltArray).buffer;

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv).buffer },
    key,
    new Uint8Array(encodedData).buffer
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv).buffer },
    key,
    new Uint8Array(data).buffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Request a signature from the wallet for key derivation
 */
export async function getEncryptionKeyFromWallet(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<CryptoKey> {
  const message = new TextEncoder().encode(
    'Sign this message to encrypt your DCA configuration. This signature will not be stored.'
  );

  const signature = await signMessage(message);
  return deriveKeyFromSignature(signature);
}

export interface EncryptedDCAData {
  transactions: string[]; // Base64 encoded signed transactions
  noteCommitments: string[]; // Privacy pool note commitments
}

/**
 * Encrypt DCA configuration data including pre-signed transactions
 */
export async function encryptDCAConfig(
  data: EncryptedDCAData,
  key: CryptoKey
): Promise<string> {
  return encryptData(JSON.stringify(data), key);
}

/**
 * Decrypt DCA configuration data
 */
export async function decryptDCAConfig(
  encryptedData: string,
  key: CryptoKey
): Promise<EncryptedDCAData> {
  const decrypted = await decryptData(encryptedData, key);
  return JSON.parse(decrypted);
}
