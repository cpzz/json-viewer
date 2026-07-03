import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SplitPane.module.css';

interface SplitPaneProps {
  leftVisible: boolean;
  rightVisible: boolean;
  children: [React.ReactNode, React.ReactNode];
}

export function SplitPane({ leftVisible, rightVisible, children }: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const maxWidth = rect.width - 200;
      setLeftWidth(Math.max(200, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const onlyLeft = leftVisible && !rightVisible;
  const onlyRight = !leftVisible && rightVisible;

  if (onlyLeft) {
    return <div className={styles.container}>{children[0]}</div>;
  }

  if (onlyRight) {
    return <div className={styles.container}>{children[1]}</div>;
  }

  return (
    <div ref={containerRef} className={`${styles.container} ${isDragging ? styles.dragging : ''}`}>
      <div className={styles.left} style={{ width: leftWidth }}>
        {children[0]}
      </div>
      <div className={styles.divider} onMouseDown={handleMouseDown}>
        <div className={styles.dividerLine} />
      </div>
      <div className={styles.right}>
        {children[1]}
      </div>
    </div>
  );
}
