import { useState, useCallback } from 'react';

export function useFileOperations() {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const openFile = useCallback(async (): Promise<{ content: string; filePath: string | null }> => {
    const result = await window.electronAPI.openFile();
    if (result.filePath) {
      const content = await window.electronAPI.readFile(result.filePath);
      setCurrentFilePath(result.filePath);
      return { content, filePath: result.filePath };
    }
    return { content: '', filePath: null };
  }, []);

  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      let filePath = currentFilePath;
      if (!filePath) {
        const result = await window.electronAPI.saveFile(content);
        filePath = result.filePath;
      } else {
        await window.electronAPI.writeFile(filePath, content);
      }
      if (filePath) {
        setCurrentFilePath(filePath);
        return true;
      }
      return false;
    },
    [currentFilePath]
  );

  const saveAs = useCallback(async (content: string): Promise<boolean> => {
    const result = await window.electronAPI.saveFile(content);
    if (result.filePath) {
      setCurrentFilePath(result.filePath);
      return true;
    }
    return false;
  }, []);

  const reloadFile = useCallback(async (): Promise<string> => {
    if (!currentFilePath) throw new Error('没有已打开的文件');
    const content = await window.electronAPI.readFile(currentFilePath);
    return content;
  }, [currentFilePath]);

  return { openFile, saveFile, saveAs, reloadFile, currentFilePath, setCurrentFilePath };
}
