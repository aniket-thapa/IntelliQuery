// utils/crypto.js

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// Get these from environment variables in a real app!
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes (256 bits)
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Prepend iv and authTag to the encrypted data for decryption
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

export function decrypt(hash) {
  const data = Buffer.from(hash, 'hex');
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.slice(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
