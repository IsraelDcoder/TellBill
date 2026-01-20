import bcrypt from "bcrypt";

/**
 * Password utility functions for secure authentication
 * Handles bcrypt hashing and password comparison
 */

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password (never resolve with plain text)
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a bcrypt hash
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches hash, false otherwise
 * @throws Error if comparison fails
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * @param password - Password to validate
 * @returns {isValid: boolean, errors: string[]}
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Verify password is safe before hashing
 * @param password - Password to verify
 * @returns {isValid: boolean, error?: string}
 */
export function verifyPasswordSafety(password: string): {
  isValid: boolean;
  error?: string;
} {
  // Check for common weak passwords
  const commonWeakPasswords = [
    "password",
    "123456",
    "12345678",
    "qwerty",
    "abc123",
    "letmein",
    "welcome",
  ];

  const lowerPassword = password.toLowerCase();
  if (commonWeakPasswords.includes(lowerPassword)) {
    return {
      isValid: false,
      error: "Password is too common, please choose a stronger password",
    };
  }

  // Check for repeated characters
  if (/(.)\1{4,}/.test(password)) {
    return {
      isValid: false,
      error: "Password has too many repeated characters",
    };
  }

  // Check for sequential characters
  if (
    /01234|12345|23456|34567|45678|56789|abcde|bcdef|cdefg|defgh|efghi|fghij|ghijk|hijkl|ijklm|jklmn|klmno|lmnop|mnopq|nopqr|opqrs|pqrst|qrstu|rstuv|stuvw|tuvwx|uvwxy|vwxyz/i.test(
      password
    )
  ) {
    return {
      isValid: false,
      error: "Password has too many sequential characters",
    };
  }

  return { isValid: true };
}
