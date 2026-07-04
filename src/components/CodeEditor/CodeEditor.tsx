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
  resetCursorKey: number;
}

export function CodeEditor({
  value,
  onChange,
  error,
  theme,
  positionMap,
  jumpTarget,
  onCursorMove,
  resetCursorKey,
}: CodeEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const onCursorMoveRef = useRef(onCursorMove);
  const decorationsRef = useRef<string[]>([]);
  const suppressCursorRef = useRef(false);

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

    // 当内容被程序替换时（来自树更新），抑制下一个光标事件的回调
    editor.onDidChangeModelContent(() => {
      suppressCursorRef.current = true;
    });

    editor.onDidChangeCursorPosition((e) => {
      updateActiveLine(e.position.lineNumber);
      if (suppressCursorRef.current) {
        suppressCursorRef.current = false;
        return;
      }
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

  // 打开新文件时重置光标到第一行
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setPosition({ lineNumber: 1, column: 1 });
    editorRef.current.revealLineInCenter(1);
    updateActiveLine(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCursorKey]);

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
