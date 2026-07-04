import { useState, useEffect, useCallback, useRef } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { SplitPane } from './components/SplitPane/SplitPane';
import { TreeEditor } from './components/TreeEditor/TreeEditor';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { useJsonSync } from './hooks/useJsonSync';
import { useFileOperations } from './hooks/useFileOperations';
import { findNodeIdByLine } from './utils/positionMap';
import styles from './App.module.css';

type Theme = 'dark' | 'light';

function App() {
  const { jsonText, treeData, parseError, positionMap, updateFromTree, updateFromCode } = useJsonSync();
  const { openFile, saveFile, reloadFile, currentFilePath } = useFileOperations();
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<{ id: string; nonce: number } | null>(null);
  const savedContentRef = useRef<string>('');
  const isDirty = jsonText !== savedContentRef.current;
  const canRefresh = currentFilePath !== null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const name = currentFilePath
      ? currentFilePath.split('\\').pop()?.split('/').pop()
      : null;
    document.title = name ? `JSON 编辑器 - ${name}` : 'JSON 编辑器';
  }, [currentFilePath]);

  const handleOpen = async () => {
    const content = await openFile();
    if (content) {
      savedContentRef.current = content;
      updateFromCode(content);
      setActiveNodeId(null);
      setJumpTarget(null);
    }
  };

  const handleSave = async () => {
    const success = await saveFile(jsonText);
    if (success) {
      savedContentRef.current = jsonText;
    }
  };

  const handleRefresh = async () => {
    if (isDirty) {
      const result = await window.electronAPI.showMessageBox({
        type: 'question',
        title: '未保存的更改',
        message: '当前文件有未保存的更改，是否保存后再刷新？',
        buttons: ['保存', '不保存', '取消'],
        cancelId: 2,
      });
      if (result.response === 2) return; // 取消
      if (result.response === 0) {
        const saved = await saveFile(jsonText);
        if (saved) savedContentRef.current = jsonText;
        else return; // 保存失败则中止
      }
    }
    try {
      const content = await reloadFile();
      savedContentRef.current = content;
      updateFromCode(content);
      setActiveNodeId(null);
      setJumpTarget(null);
    } catch (e) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: '刷新失败',
        message: `无法重新读取文件：\n${(e as Error).message}`,
        buttons: ['确定'],
        cancelId: 0,
      });
    }
  };

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleCursorMove = useCallback((lineNumber: number) => {
    const nodeId = findNodeIdByLine(positionMap, lineNumber);
    if (nodeId) {
      setActiveNodeId(nodeId);
      setScrollTarget({ id: nodeId, nonce: Date.now() });
    }
  }, [positionMap]);

  const handleSelectNode = useCallback((id: string) => {
    setActiveNodeId(id);
    setJumpTarget(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.app}>
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onRefresh={handleRefresh}
        canRefresh={canRefresh}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        onToggleLeft={() => setLeftVisible(v => !v)}
        onToggleRight={() => setRightVisible(v => !v)}
        currentFilePath={currentFilePath}
        parseError={parseError}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <SplitPane leftVisible={leftVisible} rightVisible={rightVisible}>
        <TreeEditor
          data={treeData}
          onChange={updateFromTree}
          activeNodeId={activeNodeId}
          onSelectNode={handleSelectNode}
          scrollTarget={scrollTarget}
        />
        <CodeEditor
          value={jsonText}
          onChange={updateFromCode}
          error={parseError}
          theme={theme}
          positionMap={positionMap}
          jumpTarget={jumpTarget}
          onCursorMove={handleCursorMove}
        />
      </SplitPane>
    </div>
  );
}

export default App;
