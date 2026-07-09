import { useMemo } from 'react';
import { FileJson, CheckCircle2, AlertCircle, CircleOff } from 'lucide-react';
import styles from './SchemaStatusLabel.module.css';

export interface SchemaValidationState {
  bound: boolean;
  status: 'none' | 'empty' | 'parse-error' | 'valid' | 'invalid' | 'schema-error';
  message: string;
  detail?: string;
}

interface SchemaStatusLabelProps {
  validation: SchemaValidationState;
}

export function SchemaStatusLabel({ validation }: SchemaStatusLabelProps) {
  const icon = useMemo(() => {
    switch (validation.status) {
      case 'valid':
        return <CheckCircle2 size={14} />;
      case 'none':
        return <CircleOff size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  }, [validation.status]);

  return (
    <div className={`${styles.bar} ${styles[validation.status]}`}>
      <FileJson size={14} className={styles.schemaIcon} />
      <span className={styles.message}>{validation.message}</span>
      {validation.detail && (
        <>
          <span className={styles.sep}>·</span>
          <span className={styles.statusIcon}>{icon}</span>
          <span className={styles.detail} title={validation.detail}>{validation.detail}</span>
        </>
      )}
    </div>
  );
}
