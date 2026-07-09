import { useState, useRef, useEffect } from 'react';
import { validatePatternKey } from '../../utils/schemaUtils';
import styles from './AddNodeDialog.module.css';

interface AddPatternEntryDialogProps {
  isOpen: boolean;
  pattern: string;
  hint?: string;
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

export function AddPatternEntryDialog({
  isOpen,
  pattern,
  hint,
  onConfirm,
  onCancel,
}: AddPatternEntryDialogProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setKey('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    if (!validatePatternKey(trimmed, pattern)) {
      setError(`键名须匹配格式 /${pattern}/`);
      return;
    }
    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>添加条目</div>
        <div className={styles.field}>
          <label className={styles.label}>键名</label>
          <input
            ref={inputRef}
            className={styles.input}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={hint || `须匹配 /${pattern}/`}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            格式: <code>/{pattern}/</code>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#cf1322', marginTop: 4 }}>{error}</div>
          )}
        </div>
        <div className={styles.buttons}>
          <button className={styles.cancelBtn} onClick={onCancel}>取消</button>
          <button className={styles.confirmBtn} onClick={handleSubmit} disabled={!key.trim()}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
