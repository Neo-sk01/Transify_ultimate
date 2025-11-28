/**
 * Cryptographic Utilities
 * PIN hashing, encryption, and integrity functions
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import argon2 from 'argon2';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Hash a PIN using Argon2 (recommended for password/PIN hashing)
 */
export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}

/**
 * Generate a SHA-256 hash of data
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(ciphertext: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const parts = value.split(':');
  // Format: iv:authTag:encrypted (all hex)
  if (parts.length !== 3) {
    return false;
  }
  const [iv, authTag, encrypted] = parts;
  // IV should be 32 hex chars (16 bytes), authTag should be 32 hex chars (16 bytes)
  const hexPattern = /^[0-9a-f]+$/i;
  return (
    iv.length === 32 &&
    authTag.length === 32 &&
    encrypted.length > 0 &&
    hexPattern.test(iv) &&
    hexPattern.test(authTag) &&
    hexPattern.test(encrypted)
  );
}

/**
 * Encrypt an object's specified fields
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  key: string
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'string' && value.length > 0) {
      (result as Record<string, unknown>)[field as string] = encrypt(value, key);
    }
  }
  return result;
}

/**
 * Decrypt an object's specified fields
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  key: string
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      try {
        (result as Record<string, unknown>)[field as string] = decrypt(value, key);
      } catch {
        // If decryption fails, leave the value as-is
      }
    }
  }
  return result;
}
