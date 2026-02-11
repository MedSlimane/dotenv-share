// Client-side encryption utilities using Web Crypto API
// All encryption/decryption happens in the browser - the server never sees plaintext

export async function hashInviteCode(inviteCode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(inviteCode);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bufferToBase64(new Uint8Array(hashBuffer));
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

export async function deriveKey(
  inviteCode: string,
  salt: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(inviteCode),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const saltBuffer = base64ToBuffer(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(
  content: string,
  key: CryptoKey,
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(content),
  );

  return {
    encrypted: bufferToBase64(new Uint8Array(encrypted)),
    iv: bufferToBase64(iv),
  };
}

export async function decrypt(
  encrypted: string,
  iv: string,
  key: CryptoKey,
): Promise<string> {
  const decoder = new TextDecoder();
  const encryptedBuffer = base64ToBuffer(encrypted);
  const ivBuffer = base64ToBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer.buffer as ArrayBuffer },
    key,
    encryptedBuffer.buffer as ArrayBuffer,
  );

  return decoder.decode(decrypted);
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}
