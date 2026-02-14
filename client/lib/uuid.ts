import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 compatible string using expo-crypto
 * This works reliably on both web and native React Native platforms
 */
export function generateId(): string {
  // Generate a random 16-byte buffer
  const randomBytes = Crypto.getRandomBytes(16);
  
  // Convert to hex string and format as UUID v4
  let hex = '';
  for (let i = 0; i < randomBytes.length; i++) {
    hex += randomBytes[i].toString(16).padStart(2, '0');
  }
  
  // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is one of 8, 9, A, or B
  const uuid = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16),
    ((parseInt(hex.substring(16, 18), 16) & 0x3) | 0x8).toString(16).padStart(2, '0') + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-');
  
  return uuid;
}
