/**
 * ✅ INPUT SANITIZATION UTILITIES
 *
 * Prevents common security vulnerabilities:
 * 1. XSS (Cross-Site Scripting) - Remove HTML/JavaScript
 * 2. SQL Injection - Use parameterized queries (Drizzle ORM)
 * 3. Command Injection - Restrict shell characters
 * 4. Path Traversal - Normalize file paths
 * 5. NoSQL Injection - Validate data types
 */

/**
 * XSS Prevention: Remove or escape HTML special characters
 * Converts: <script>alert('xss')</script> → &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return str.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * XSS Prevention: Strip all HTML tags
 * Converts: <b>Bold</b> text → Bold text
 * More aggressive than escapeHtml
 */
export function stripHtmlTags(str: string): string {
  if (!str) return "";
  
  // Remove all HTML tags and decode entities
  return str
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&[a-z]+;/gi, "") // Remove HTML entities
    .trim();
}

/**
 * XSS Prevention: Remove potentially dangerous HTML attributes
 * Removes: onclick, onload, onerror, etc. event handlers
 */
export function removeDangerousAttributes(str: string): string {
  if (!str) return "";
  
  // Remove event handlers (onclick, onload, etc.)
  let sanitized = str.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "");
  
  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, "");
  
  // Remove object tags
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, "");
  
  // Remove embed tags
  sanitized = sanitized.replace(/<embed[^>]*>/gi, "");
  
  return sanitized;
}

/**
 * Command Injection Prevention: Remove shell special characters
 * Prevents: commands like `rm -rf /` or $(malicious)
 */
export function sanitizeCommandInput(str: string): string {
  if (!str) return "";
  
  // Remove dangerous shell characters
  const dangerous = /[;&|`$(){}[\]<>\\]/g;
  
  if (dangerous.test(str)) {
    throw new Error(
      `Input contains dangerous shell characters: ${str
        .match(dangerous)
        ?.join(", ")}`
    );
  }
  
  return str;
}

/**
 * Path Traversal Prevention: Normalize file paths
 * Prevents: ../../../etc/passwd attacks
 */
export function sanitizeFilePath(filepath: string): string {
  if (!filepath) return "";
  
  // Reject absolute paths
  if (filepath.startsWith("/") || /^[a-z]:/i.test(filepath)) {
    throw new Error("Absolute paths are not allowed");
  }
  
  // Reject path traversal attempts
  if (filepath.includes("..")) {
    throw new Error("Path traversal sequences (..) are not allowed");
  }
  
  // Reject null bytes
  if (filepath.includes("\0")) {
    throw new Error("Null bytes are not allowed in file paths");
  }
  
  return filepath;
}

/**
 * SQL Injection Prevention: Parameter validation
 * Note: Drizzle ORM uses parameterized queries by default
 * This function validates SQL identifiers (table/column names only)
 */
export function validateSqlIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  
  // Only allow alphanumeric, underscore, and no leading numbers
  const validIdentifier = /^[a-z_][a-z0-9_]*$/i;
  return validIdentifier.test(identifier);
}

/**
 * NoSQL Injection Prevention: Type checking
 * Ensures values are expected types (not objects with $operators)
 */
export function validateNoSqlValue(value: any): boolean {
  if (typeof value === "object" && value !== null) {
    // Reject objects that contain NoSQL operators
    const objStr = JSON.stringify(value);
    if (/^\s*\$/.test(objStr)) {
      return false;
    }
  }
  return true;
}

/**
 * Email Injection Prevention: Validate email format strictly
 * Prevents email header injection attacks
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";
  
  // Normalize: lowercase and trim
  let sanitized = email.toLowerCase().trim();
  
  // Reject newlines and carriage returns (email header injection)
  if (/[\r\n]/.test(sanitized)) {
    throw new Error("Email contains invalid characters (newlines)");
  }
  
  // Reject multiple @ symbols
  if ((sanitized.match(/@/g) || []).length !== 1) {
    throw new Error("Email must contain exactly one @ symbol");
  }
  
  return sanitized;
}

/**
 * Phone Number Sanitization: Remove non-numeric characters
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters except + (for international)
  const sanitized = phone.replace(/[^\d+]/g, "");
  
  // Ensure reasonable length (10-15 digits)
  if (sanitized.replace(/\D/g, "").length < 10) {
    throw new Error("Phone number too short");
  }
  
  if (sanitized.replace(/\D/g, "").length > 15) {
    throw new Error("Phone number too long");
  }
  
  return sanitized;
}

/**
 * String Sanitization: Trim and normalize whitespace
 */
export function sanitizeString(str: string, maxLength: number = 255): string {
  if (!str) return "";
  
  // Trim whitespace
  let sanitized = str.trim();
  
  // Normalize whitespace (replace multiple spaces with single space)
  sanitized = sanitized.replace(/\s+/g, " ");
  
  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * JSON Sanitization: Validate and parse JSON safely
 */
export function sanitizeJson(json: string): any {
  try {
    // Try to parse JSON
    const parsed = JSON.parse(json);
    
    // Ensure no circular references
    JSON.stringify(parsed);
    
    return parsed;
  } catch {
    throw new Error("Invalid JSON format");
  }
}

/**
 * URL Sanitization: Validate and normalize URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Only HTTP and HTTPS protocols are allowed");
    }
    
    return urlObj.toString();
  } catch {
    throw new Error("Invalid URL format");
  }
}

/**
 * Name Sanitization: Remove special characters that could be dangerous
 */
export function sanitizeName(name: string): string {
  if (!name) return "";
  
  // Remove leading/trailing whitespace
  let sanitized = name.trim();
  
  // Allow only: letters, numbers, spaces, hyphens, apostrophes
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-']/g, "");
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ");
  
  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

/**
 * Amount Sanitization: Ensure valid decimal format
 */
export function sanitizeAmount(amount: any): number {
  const num = parseFloat(amount);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error("Invalid amount");
  }
  
  if (num < 0) {
    throw new Error("Amount cannot be negative");
  }
  
  if (num > 1000000) {
    throw new Error("Amount exceeds maximum allowed value");
  }
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * UUID Sanitization: Validate UUID format
 */
export function sanitizeUUID(uuid: string): string {
  if (!uuid) return "";
  
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error("Invalid UUID format");
  }
  
  return uuid.toLowerCase();
}

/**
 * Enum Sanitization: Validate against allowed values
 */
export function sanitizeEnum<T>(value: any, allowedValues: T[]): T {
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid value. Allowed: ${allowedValues.join(", ")}`
    );
  }
  
  return value as T;
}

/**
 * Compound Sanitization: Text with HTML escaping
 * Best for user-generated content that might be displayed
 */
export function sanitizeUserContent(content: string): string {
  // Trim whitespace
  const trimmed = sanitizeString(content);
  
  // Remove dangerous HTML attributes
  const cleaned = removeDangerousAttributes(trimmed);
  
  // Escape remaining HTML
  const escaped = escapeHtml(cleaned);
  
  return escaped;
}

/**
 * Batch Sanitization: Apply multiple sanitization rules
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Validate key is safe (prevent object injection)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid object key: ${key}`);
    }
    
    // Sanitize based on value type
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "number") {
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      );
    } else if (value === null) {
      sanitized[key] = null;
    } else if (typeof value === "object") {
      // Nested object - recursively sanitize
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
}

/**
 * Content Security Policy (CSP) Header Generator
 * Call in Express middleware to set CSP headers
 */
export function generateCSPHeader(): string {
  return (
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
}

/**
 * Security Headers Middleware
 */
export function securityHeaders(req: any, res: any, next: any): void {
  // Prevent XSS attacks
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy
  res.setHeader("Content-Security-Policy", generateCSPHeader());
  
  // Feature Policy / Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );
  
  // Remove powered by header
  res.removeHeader("X-Powered-By");
  
  next();
}
