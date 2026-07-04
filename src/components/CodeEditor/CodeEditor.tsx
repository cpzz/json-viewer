import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Editor, { OnMount, BeforeMount, OnChange } from '@monaco-editor/react';
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
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const onCursorMoveRef = useRef(onCursorMove);
  const decorationsRef = useRef<string[]>([]);

  useLayoutEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);

  const updateActiveLine = useCallback((lineNumber: number) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'activeLineLeftBorder',
        },
      },
    ]);
  }, []);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('highlight-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.lineHighlightBackground': '#264f78',
        'editor.lineHighlightBorder': '#00000000',
      },
    });
    monaco.editor.defineTheme('highlight-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.lineHighlightBackground': '#cce5ff',
        'editor.lineHighlightBorder': '#00000000',
      },
    });
  };

  const handleChange: OnChange = (val) => {
    onChange(val ?? '');
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.getModel()?.updateOptions({ tabSize: 2 });

    const pos = editor.getPosition();
    if (pos) updateActiveLine(pos.lineNumber);

    editor.onDidChangeCursorPosition((e) => {
      updateActiveLine(e.position.lineNumber);
      onCursorMoveRef.current(e.position.lineNumber);
    });
  };

  useEffect(() => {
    if (!editorRef.current || !jumpTarget) return;
    const info = positionMap.get(jumpTarget);
    if (!info) return;

    editorRef.current.revealLineInCenter(info.startLine);
    editorRef.current.setPosition({
      lineNumber: info.startLine,
      column: 1,
    });
  }, [jumpTarget, positionMap]);

  return (
    <div className={styles.container}>
      <Editor
        height="100%"
        defaultLanguage="json"
        beforeMount={handleBeforeMount}
        theme={theme === 'dark' ? 'highlight-dark' : 'highlight-light'}
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
