import { useState, useCallback, useMemo } from 'react';
import Ajv, { type ValidateFunction } from 'ajv';

export interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  default?: any;
  enum?: any[];
  format?: string;
  $ref?: string;
  $schema?: string;
  $id?: string;
  definitions?: Record<string, JsonSchema>;
  [key: string]: any;
}

export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
}

export function useSchemaProcessor() {
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const ajv = useMemo(() => new Ajv({ allErrors: true }), []);

  const loadSchema = useCallback(async (schemaText: string) => {
    try {
      const parsed = JSON.parse(schemaText) as JsonSchema;
      setSchema(parsed);
      setValidationErrors([]);

      const initialData = generateDefaultData(parsed);
      setFormData(initialData);

      return { success: true, schema: parsed };
    } catch (e) {
      setValidationErrors([{
        path: '/',
        message: `Schema 解析错误: ${(e as Error).message}`,
      }]);
      return { success: false, error: (e as Error).message };
    }
  }, []);

  const validateSchema = useCallback((schemaToValidate: JsonSchema): boolean => {
    try {
      ajv.compile(schemaToValidate);
      setValidationErrors([]);
      return true;
    } catch (e) {
      setValidationErrors([{
        path: '/',
        message: `Schema 验证错误: ${(e as Error).message}`,
      }]);
      return false;
    }
  }, [ajv]);

  const updateFormData = useCallback((data: Record<string, any>) => {
    setFormData(data);
  }, []);

  const generateJson = useCallback(() => {
    return JSON.stringify(formData, null, 2);
  }, [formData]);

  return {
    schema,
    formData,
    validationErrors,
    loadSchema,
    validateSchema,
    updateFormData,
    generateJson,
    setSchema,
    setFormData,
  };
}

function generateDefaultData(schema: JsonSchema): Record<string, any> {
  const data: Record<string, any> = {};

  if (schema.type === 'object' && schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.default !== undefined) {
        data[key] = prop.default;
      } else if (prop.type === 'object') {
        data[key] = generateDefaultData(prop);
      } else if (prop.type === 'array') {
        data[key] = [];
      } else if (prop.enum && prop.enum.length > 0) {
        data[key] = prop.enum[0];
      }
    }
  }

  return data;
}
