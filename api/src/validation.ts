import type { DeviceFieldMapping } from '@/db/types';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  validatedData: Record<string, unknown>;
}

/**
 * Validate ingest data against device field mappings.
 * If no field mappings are configured, all data passes through.
 * If field mappings exist, only mapped fields are validated and included.
 */
export function validateIngestData(
  data: Record<string, unknown>,
  fieldMappings?: DeviceFieldMapping[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const validatedData: Record<string, unknown> = {};

  // If no field mappings configured, pass through all data
  if (!fieldMappings || fieldMappings.length === 0) {
    return { ok: true, errors: [], validatedData: data };
  }

  for (const mapping of fieldMappings) {
    const { sourceField, dataType, min, max } = mapping;
    const value = data[sourceField];

    // Field is not present - skip (optional fields)
    if (value === undefined) {
      continue;
    }

    // Validate based on data type
    switch (dataType) {
      case "number": {
        const numValue = typeof value === "number" ? value : parseFloat(String(value));

        if (isNaN(numValue)) {
          errors.push({
            field: sourceField,
            message: `Expected number, got ${typeof value}`,
            value,
          });
          continue;
        }

        if (min !== undefined && numValue < min) {
          errors.push({
            field: sourceField,
            message: `Value ${numValue} is below minimum ${min}`,
            value: numValue,
          });
          continue;
        }

        if (max !== undefined && numValue > max) {
          errors.push({
            field: sourceField,
            message: `Value ${numValue} exceeds maximum ${max}`,
            value: numValue,
          });
          continue;
        }

        validatedData[sourceField] = numValue;
        break;
      }

      case "string": {
        if (typeof value !== "string") {
          // Coerce to string if possible
          validatedData[sourceField] = String(value);
        } else {
          validatedData[sourceField] = value;
        }
        break;
      }

      case "boolean": {
        if (typeof value === "boolean") {
          validatedData[sourceField] = value;
        } else if (value === "true" || value === 1 || value === "1") {
          validatedData[sourceField] = true;
        } else if (value === "false" || value === 0 || value === "0") {
          validatedData[sourceField] = false;
        } else {
          errors.push({
            field: sourceField,
            message: `Expected boolean, got ${typeof value}`,
            value,
          });
          continue;
        }
        break;
      }

      case "json": {
        // JSON type accepts any structured data
        if (typeof value === "object" && value !== null) {
          validatedData[sourceField] = value;
        } else if (typeof value === "string") {
          try {
            validatedData[sourceField] = JSON.parse(value);
          } catch {
            errors.push({
              field: sourceField,
              message: `Expected valid JSON, got invalid string`,
              value,
            });
            continue;
          }
        } else {
          validatedData[sourceField] = value;
        }
        break;
      }

      default:
        // Unknown type - pass through
        validatedData[sourceField] = value;
    }
  }

  // Include any unmapped fields as passthrough (device may send extra data)
  const mappedFields = new Set(fieldMappings.map((m) => m.sourceField));
  for (const [key, value] of Object.entries(data)) {
    if (!mappedFields.has(key) && !(key in validatedData)) {
      validatedData[key] = value;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    validatedData,
  };
}
