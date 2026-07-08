import { useMemo, useCallback, lazy, Suspense } from 'react';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { JsonSchema } from '../../hooks/useSchemaProcessor';
import { CustomObjectFieldTemplate } from './CustomObjectField';
import styles from './SchemaForm.module.css';

export type FormTheme = 'antd' | 'mui';

// 动态导入不同的主题
const AntdForm = lazy(() => import('@rjsf/antd').then(module => ({ default: module.Form })));
const MuiForm = lazy(() => import('@rjsf/mui').then(module => ({ default: module.Form })));

interface SchemaFormProps {
  schema: JsonSchema;
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  onSubmit?: () => void;
  uiSchema?: UiSchema;
  theme?: FormTheme;
}

export function SchemaForm({ schema, formData, onChange, uiSchema, theme = 'antd' }: SchemaFormProps) {
  const rjsfSchema = useMemo(() => {
    return convertToRJSFSchema(schema);
  }, [schema]);

  const handleChange = useCallback((event: any) => {
    if (event.formData !== undefined) {
      onChange(event.formData);
    }
  }, [onChange]);

  // 根据主题选择对应的 Form 组件
  const FormComponent = useMemo(() => {
    switch (theme) {
      case 'mui':
        return MuiForm;
      case 'antd':
      default:
        return AntdForm;
    }
  }, [theme]);

  if (!schema || !schema.properties) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
          无效的 Schema 定义
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Suspense fallback={<div style={{ padding: '20px' }}>加载中...</div>}>
        <FormComponent
          schema={rjsfSchema}
          formData={formData}
          onChange={handleChange}
          validator={validator}
          uiSchema={{
            ...uiSchema,
            'ui:submitButtonOptions': {
              norender: true,
            },
          }}
          templates={{
            ObjectFieldTemplate: CustomObjectFieldTemplate,
            ButtonTemplates: {
              SubmitButton: () => null,
            },
          }}
          liveValidate={true}
          showErrorList="bottom"
          noHtml5Validate={true}
        />
      </Suspense>
    </div>
  );
}

function convertToRJSFSchema(schema: JsonSchema): RJSFSchema {
  const result = {
    ...schema,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, prop]) => [
            key,
            convertToRJSFSchema(prop),
          ])
        )
      : undefined,
    items: schema.items ? convertToRJSFSchema(schema.items) : undefined,
  };

  return result as unknown as RJSFSchema;
}
