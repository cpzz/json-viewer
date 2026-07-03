import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { SplitPane } from './components/SplitPane/SplitPane';
import { TreeEditor } from './components/TreeEditor/TreeEditor';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { useJsonSync } from './hooks/useJsonSync';
import { useFileOperations } from './hooks/useFileOperations';
import styles from './App.module.css';

function App() {
  const { jsonText, treeData, parseError, updateFromTree, updateFromCode } = useJsonSync();
  const { openFile, saveFile, currentFilePath } = useFileOperations();
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);

  useEffect(() => {
    const name = currentFilePath
      ? currentFilePath.split('\\').pop()?.split('/').pop()
      : null;
    document.title = name ? `JSON 编辑器 - ${name}` : 'JSON 编辑器';
  }, [currentFilePath]);

  const handleOpen = async () => {
    const content = await openFile();
    if (content) updateFromCode(content);
  };

  const handleSave = async () => {
    await saveFile(jsonText);
  };

  const handleRefresh = () => {
    updateFromCode(jsonText);
  };

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
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        onToggleLeft={() => setLeftVisible(v => !v)}
        onToggleRight={() => setRightVisible(v => !v)}
        currentFilePath={currentFilePath}
        parseError={parseError}
      />
      <SplitPane leftVisible={leftVisible} rightVisible={rightVisible}>
        <TreeEditor data={treeData} onChange={updateFromTree} />
        <CodeEditor value={jsonText} onChange={updateFromCode} error={parseError} />
      </SplitPane>
    </div>
  );
}

export default App;
