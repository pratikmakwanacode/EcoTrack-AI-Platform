// Security & Validation utility for EcoTrack AI

// Simple hash generator for integrity checks
const generateChecksum = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash;
};

// Obfuscate JSON object string with checksum verification
export function obfuscateData(data: any): string {
  try {
    const rawString = JSON.stringify(data);
    const checksum = generateChecksum(rawString);
    const envelope = {
      payload: rawString,
      integrity: checksum,
      timestamp: Date.now()
    };
    const envelopeStr = JSON.stringify(envelope);
    
    if (typeof window !== 'undefined') {
      return window.btoa(encodeURIComponent(envelopeStr));
    }
    return Buffer.from(envelopeStr).toString('base64');
  } catch (error) {
    console.error("Obfuscation error:", error);
    return "";
  }
}

// Deobfuscate and verify checksum integrity
export function deobfuscateData(obfuscated: string): any {
  if (!obfuscated) return null;
  try {
    let decodedStr = "";
    if (typeof window !== 'undefined') {
      decodedStr = decodeURIComponent(window.atob(obfuscated));
    } else {
      decodedStr = Buffer.from(obfuscated, 'base64').toString('utf-8');
    }
    
    const envelope = JSON.parse(decodedStr);
    if (!envelope || !envelope.payload || envelope.integrity === undefined) {
      console.warn("Invalid data structure loaded.");
      return null;
    }
    
    // Verify checksum
    const calculatedChecksum = generateChecksum(envelope.payload);
    if (calculatedChecksum !== envelope.integrity) {
      console.warn("Data integrity failure! Checking checksum failed (tampering detected).");
      return null;
    }
    
    return JSON.parse(envelope.payload);
  } catch (error) {
    console.error("Deobfuscation failed (corrupted data):", error);
    return null;
  }
}

// Sanitize inputs to prevent XSS/injection
export function sanitizeInput(input: string): string {
  if (!input) return "";
  
  // 1. Remove script tags and contents
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // 2. Strip HTML elements
  cleaned = cleaned.replace(/<[^>]*>?/gm, "");
  
  // 3. Escape HTML entities
  cleaned = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
    
  return cleaned.trim();
}

// Validate positive numbers with length thresholds
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: number;
}

export function validatePositiveNumber(
  fieldName: string, 
  value: string, 
  maxDigits: number = 6
): ValidationResult {
  const sanitizedStr = sanitizeInput(value);
  
  if (sanitizedStr === "") {
    return { isValid: true, sanitizedValue: 0 };
  }
  
  // Reject scripts or tags in sanitization
  if (sanitizedStr !== value.trim()) {
    return { isValid: false, error: `${fieldName} contains invalid characters.` };
  }
  
  // Limit length
  if (sanitizedStr.length > maxDigits) {
    return { isValid: false, error: `${fieldName} exceeds maximum limit of ${maxDigits} digits.` };
  }
  
  // Check strict format (digits or decimal only, no signs, no letters)
  if (!/^\d+(\.\d+)?$/.test(sanitizedStr)) {
    return { isValid: false, error: `${fieldName} must be a positive number containing only digits.` };
  }
  
  const num = Number(sanitizedStr);
  if (isNaN(num) || num < 0) {
    return { isValid: false, error: `${fieldName} must be a positive number.` };
  }
  
  return { isValid: true, sanitizedValue: num };
}
