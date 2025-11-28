/**
 * Cryptographic Utilities Property Tests
 * Verifies encryption/decryption round-trip and hash properties
 */

import fc from 'fast-check';
import { encrypt, decrypt, sha256 } from '../../src/utils/crypto';
import { fcConfig } from '../setup';

describe('Crypto Utilities - Property Tests', () => {
  /**
   * **Feature: transrify-core, Property: Encryption Round Trip**
   * **Validates: Requirements 10.3**
   * 
   * For any plaintext and key, encrypting then decrypting should return the original plaintext
   */
  it('encryption/decryption round trip preserves data', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 8, maxLength: 64 }),
        (plaintext, key) => {
          const encrypted = encrypt(plaintext, key);
          const decrypted = decrypt(encrypted, key);
          return decrypted === plaintext;
        }
      ),
      fcConfig
    );
  });

  /**
   * **Feature: transrify-core, Property: Encrypted data differs from plaintext**
   * **Validates: Requirements 10.3**
   * 
   * For any non-empty plaintext, the encrypted form should not equal the plaintext
   */
  it('encrypted data differs from plaintext', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 8, maxLength: 64 }),
        (plaintext, key) => {
          const encrypted = encrypt(plaintext, key);
          return encrypted !== plaintext;
        }
      ),
      fcConfig
    );
  });

  /**
   * **Feature: transrify-core, Property: SHA256 determinism**
   * 
   * For any input, sha256 should always produce the same output
   */
  it('sha256 is deterministic', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const hash1 = sha256(input);
          const hash2 = sha256(input);
          return hash1 === hash2;
        }
      ),
      fcConfig
    );
  });

  /**
   * **Feature: transrify-core, Property: SHA256 produces 64-character hex string**
   */
  it('sha256 produces 64-character hex string', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const hash = sha256(input);
          return hash.length === 64 && /^[0-9a-f]+$/.test(hash);
        }
      ),
      fcConfig
    );
  });
});
