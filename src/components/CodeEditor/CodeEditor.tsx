import { useRef, useEffect, useLayoutEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { PositionInfo } from '../../utils/positionMap';
import styles from './CodeEditor.module.css';

type EditorInstance = Parameters<OnMount>[0];

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  theme: 'dark' | 'light';
  positionMap: Map<string, PositionInfo>;
  jumpTarget: string | null;
  onCursorMove: (lineNumber: number) => void;
}

export function CodeEditor({
  value,
  onChange,
  error,
  theme,
  positionMap,
  jumpTarget,
  onCursorMove,
}: CodeEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const isProgrammaticJumpRef = useRef(false);
  const onCursorMoveRef = useRef(onCursorMove);

  useLayoutEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);

  const handleChange: OnChange = (val) => {
    onChange(val ?? '');
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.getModel()?.updateOptions({ tabSize: 2 });

    editor.onDidChangeCursorPosition((e) => {
      if (isProgrammaticJumpRef.current) return;
      onCursorMoveRef.current(e.position.lineNumber);
    });
  };

  useEffect(() => {
    if (!editorRef.current || !jumpTarget) return;
    const info = positionMap.get(jumpTarget);
    if (!info) return;

    isProgrammaticJumpRef.current = true;
    editorRef.current.revealLineInCenter(info.startLine);
    editorRef.current.setPosition({
      lineNumber: info.startLine,
      column: 1,
    });
    setTimeout(() => {
      isProgrammaticJumpRef.current = false;
    }, 100);
  }, [jumpTarget, positionMap]);

  return (
    <div className={styles.container}>
      <Editor
        height="100%"
        defaultLanguage="json"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
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
