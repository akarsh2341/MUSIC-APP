import { useState, type DragEvent } from 'react';

/** HTML5 drag-and-drop reordering for lists (touch users get Move up / Move down in the row menu). */
export function useReorder(onMove: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const propsFor = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setDragIndex(i);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i));
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (overIndex !== i) setOverIndex(i);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i);
      reset();
    },
    onDragEnd: reset,
  });

  return { propsFor, dragIndex, overIndex };
}
