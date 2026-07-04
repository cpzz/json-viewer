import { useState, useRef, useEffect } from 'react';
import { JsonNodeType } from '../../types';
import styles from './AddNodeDialog.module.css';

interface AddNodeDialogProps {
  isOpen: boolean;
  onConfirm: (key: string, type: JsonNodeType) => void;
  onCancel: () => void;
}

const NODE_TYPES: { value: JsonNodeType; label: string }[] = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
  { value: 'null', label: 'null' },
  { value: 'object', label: 'object' },
  { value: 'array', label: 'array' },
];

export function AddNodeDialog({ isOpen, onConfirm, onCancel }: AddNodeDialogProps) {
  const [key, setKey] = useState('');
  const [type, setType] = useState<JsonNodeType>('string');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setKey('');
      setType('string');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    onConfirm(trimmed, type);
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
        <div className={styles.title}>添加子节点</div>
        <div className={styles.field}>
          <label className={styles.label}>Key</label>
          <input
            ref={inputRef}
            className={styles.input}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入节点名称"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>类型</label>
          <select
            className={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as JsonNodeType)}
          >
            {NODE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
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
