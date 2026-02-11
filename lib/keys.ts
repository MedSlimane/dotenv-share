// Client-side key management for organization encryption keys
// Passphrases stored in sessionStorage (cleared on tab close)
// Derived CryptoKeys cached in memory for performance

import { deriveKey } from "./crypto";

const keyCache = new Map<string, CryptoKey>();

export function getStoredPassphrase(orgId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`dotenv-passphrase-${orgId}`);
}

export function storePassphrase(orgId: string, passphrase: string): void {
  sessionStorage.setItem(`dotenv-passphrase-${orgId}`, passphrase);
}

export function clearPassphrase(orgId: string): void {
  sessionStorage.removeItem(`dotenv-passphrase-${orgId}`);
  keyCache.delete(orgId);
}

export async function getOrDeriveKey(
  orgId: string,
  salt: string,
): Promise<CryptoKey | null> {
  if (keyCache.has(orgId)) return keyCache.get(orgId)!;

  const passphrase = getStoredPassphrase(orgId);
  if (!passphrase) return null;

  const key = await deriveKey(passphrase, salt);
  keyCache.set(orgId, key);
  return key;
}

export async function deriveAndStoreKey(
  orgId: string,
  salt: string,
  passphrase: string,
): Promise<CryptoKey> {
  storePassphrase(orgId, passphrase);
  const key = await deriveKey(passphrase, salt);
  keyCache.set(orgId, key);
  return key;
}
