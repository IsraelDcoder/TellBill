import { Request, Response } from "express";

/**
 * ✅ INPUT VALIDATION UTILITIES
 * Comprehensive validation for all user inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password validation
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters",
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one uppercase letter",
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one lowercase letter",
    });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one number",
    });
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one special character (!@#$%^&*)",
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Phone number validation (basic)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * URL validation
 */
export function validateUrl(url: string): boolean {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * String length validation
 */
export function validateStringLength(
  value: string,
  minLength: number = 1,
  maxLength: number = 255
): boolean {
  if (!value) return minLength === 0;
  return value.length >= minLength && value.length <= maxLength;
}

/**
 * Number validation
 */
export function validateNumber(
  value: any,
  minValue?: number,
  maxValue?: number
): boolean {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (minValue !== undefined && num < minValue) return false;
  if (maxValue !== undefined && num > maxValue) return false;
  return true;
}

/**
 * Amount validation (for financial values)
 * Ensures non-negative numbers with max 2 decimal places
 */
export function validateAmount(value: any): boolean {
  const num = Number(value);
  if (isNaN(num) || num < 0) return false;
  // Check for max 2 decimal places
  return /^\d+(\.\d{1,2})?$/.test(value.toString());
}

/**
 * UUID validation
 */
export function validateUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Tax ID validation (basic - alphanumeric)
 */
export function validateTaxId(value: string): boolean {
  if (!value) return true; // Optional field
  return /^[A-Za-z0-9\-]{3,20}$/.test(value);
}

/**
 * Enum validation
 */
export function validateEnum<T>(value: any, allowedValues: T[]): boolean {
  return allowedValues.includes(value);
}

/**
 * Required field validation
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

/**
 * Comprehensive signup validation
 */
export function validateSignup(body: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate email
  if (!isRequired(body.email)) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(body.email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  } else if (!validateStringLength(body.email, 3, 255)) {
    errors.push({
      field: "email",
      message: "Email must be between 3 and 255 characters",
    });
  }

  // Validate password
  const passwordValidation = validatePassword(body.password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  // Validate name (optional)
  if (body.name && !validateStringLength(body.name, 1, 100)) {
    errors.push({
      field: "name",
      message: "Name must be between 1 and 100 characters",
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Comprehensive login validation
 */
export function validateLogin(body: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate email
  if (!isRequired(body.email)) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(body.email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  // Validate password
  if (!isRequired(body.password)) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Comprehensive payment validation
 */
export function validatePayment(body: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate userId
  if (!isRequired(body.userId)) {
    errors.push({ field: "userId", message: "User ID is required" });
  } else if (!validateUUID(body.userId)) {
    errors.push({ field: "userId", message: "Invalid user ID format" });
  }

  // Validate planId
  if (!isRequired(body.planId)) {
    errors.push({ field: "planId", message: "Plan ID is required" });
  } else if (!validateEnum(body.planId, ["solo", "professional"])) {
    errors.push({
      field: "planId",
      message: 'Plan ID must be solo or professional',
    });
  }

  // Validate email
  if (!isRequired(body.email)) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(body.email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  // Validate phone number (optional but validate if provided)
  if (body.phoneNumber && !validatePhoneNumber(body.phoneNumber)) {
    errors.push({ field: "phoneNumber", message: "Invalid phone number" });
  }

  // Validate full name
  if (!isRequired(body.userFullName)) {
    errors.push({
      field: "userFullName",
      message: "Full name is required",
    });
  } else if (!validateStringLength(body.userFullName, 2, 100)) {
    errors.push({
      field: "userFullName",
      message: "Full name must be between 2 and 100 characters",
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Comprehensive invoice validation
 */
export function validateInvoice(body: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate client name
  if (body.clientName && !validateStringLength(body.clientName, 1, 100)) {
    errors.push({
      field: "clientName",
      message: "Client name must be between 1 and 100 characters",
    });
  }

  // Validate client email (optional but validate if provided)
  if (body.clientEmail && !validateEmail(body.clientEmail)) {
    errors.push({ field: "clientEmail", message: "Invalid email format" });
  }

  // Validate client phone (optional but validate if provided)
  if (body.clientPhone && !validatePhoneNumber(body.clientPhone)) {
    errors.push({ field: "clientPhone", message: "Invalid phone number" });
  }

  // Validate amounts
  if (body.subtotal !== undefined && !validateAmount(body.subtotal)) {
    errors.push({ field: "subtotal", message: "Invalid subtotal amount" });
  }

  if (body.taxAmount !== undefined && !validateAmount(body.taxAmount)) {
    errors.push({ field: "taxAmount", message: "Invalid tax amount" });
  }

  if (body.total !== undefined && !validateAmount(body.total)) {
    errors.push({ field: "total", message: "Invalid total amount" });
  }

  // Validate tax rate (should be between 0 and 1, e.g., 0.08 for 8%)
  if (
    body.taxRate !== undefined &&
    !validateNumber(body.taxRate, 0, 1)
  ) {
    errors.push({
      field: "taxRate",
      message: "Tax rate must be between 0 and 1",
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Middleware to validate and respond with errors
 */
export function respondWithValidationErrors(
  res: Response,
  errors: ValidationError[]
) {
  return res.status(400).json({
    success: false,
    error: "Validation failed",
    details: errors,
  });
}

/**
 * Sanitize string input (remove/escape dangerous characters)
 */
export function sanitizeString(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/[<>\"'`]/g, "") // Remove HTML/JS special chars
    .substring(0, 255); // Limit length
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate and sanitize all user-provided strings in an object
 */
export function sanitizeObject(obj: any): any {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
