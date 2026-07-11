import { useState, useCallback, useMemo } from 'react';
import Ajv2020 from 'ajv/dist/2020';
import { type ValidateFunction } from 'ajv';

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const ajv = useMemo(() => new Ajv2020({ allErrors: true, strict: false }), []);

  const loadSchema = useCallback(async (schemaText: string) => {
    try {
      const parsed = JSON.parse(schemaText) as JsonSchema;
      setSchema(parsed);
      setValidationErrors([]);
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

  const validateFn = useMemo<ValidateFunction | null>(() => {
    if (!schema) return null;
    try {
      return ajv.compile(schema);
    } catch {
      return null;
    }
  }, [schema, ajv]);

  const validateJsonData = useCallback((jsonText: string, parseError: string | null): {
    bound: boolean;
    status: 'none' | 'empty' | 'parse-error' | 'valid' | 'invalid' | 'schema-error';
    message: string;
    detail?: string;
  } => {
    if (!schema) {
      return { bound: false, status: 'none', message: '未绑定 JSON Schema' };
    }

    if (!validateFn) {
      return {
        bound: true,
        status: 'schema-error',
        message: '已绑定 JSON Schema',
        detail: 'Schema 本身无效，无法校验',
      };
    }

    if (parseError) {
      return {
        bound: true,
        status: 'parse-error',
        message: '已绑定 JSON Schema',
        detail: 'JSON 语法错误',
      };
    }

    if (!jsonText.trim()) {
      return {
        bound: true,
        status: 'empty',
        message: '已绑定 JSON Schema',
        detail: '内容为空',
      };
    }

    try {
      const data = JSON.parse(jsonText);
      const valid = validateFn(data);
      if (valid) {
        return {
          bound: true,
          status: 'valid',
          message: '已绑定 JSON Schema',
          detail: '符合规范',
        };
      }

      const firstError = validateFn.errors?.[0];
      const errorPath = firstError && 'instancePath' in firstError
        ? String((firstError as { instancePath: string }).instancePath)
        : '/';
      const detail = firstError
        ? `${errorPath || '/'} ${firstError.message ?? '不符合规范'}`
        : '不符合规范';

      return {
        bound: true,
        status: 'invalid',
        message: '已绑定 JSON Schema',
        detail,
      };
    } catch (e) {
      return {
        bound: true,
        status: 'parse-error',
        message: '已绑定 JSON Schema',
        detail: (e as Error).message,
      };
    }
  }, [schema, validateFn]);

  return {
    schema,
    validationErrors,
    loadSchema,
    validateSchema,
    validateJsonData,
    setSchema,
  };
}
