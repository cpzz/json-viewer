import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function CodeEditor({ value, onChange, error }: CodeEditorProps) {
  const handleChange: OnChange = (val) => {
    onChange(val ?? '');
  };

  const handleMount: OnMount = (editor) => {
    editor.getModel()?.updateOptions({ tabSize: 2 });
  };

  return (
    <div className={styles.container}>
      <Editor
        height="100%"
        defaultLanguage="json"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          renderWhitespace: 'selection',
          tabSize: 2,
        }}
      />
      {error && (
        <div className={styles.errorBar}>
          <span>&#9888; {error}</span>
        </div>
      )}
    </div>
  );
}
