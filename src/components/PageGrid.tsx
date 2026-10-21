import { useLayoutEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import { PageCard } from './PageCard';
import { useVault, vault, type PageItem } from '../state/store';

export interface DragIndicator {
  targetId: string;
  side: 'before' | 'after';
}

export interface CardDnd {
  draggingId: string | null;
  indicator: DragIndicator | null;
  onDragStart: (id: string, event: DragEvent) => void;
  onDragOver: (id: string, event: DragEvent) => void;
  onDrop: (id: string, event: DragEvent) => void;
  onDragEnd: () => void;
}

const COLUMN_GAP = 12;
const MIN_COLUMN = 168;

function useMeasuredWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function PageGrid({ pages }: { pages: readonly PageItem[] }) {
  const { sources: sourceMeta } = useVault();
  const gridRef = useRef<HTMLDivElement>(null);
  const gridWidth = useMeasuredWidth(gridRef);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<DragIndicator | null>(null);

  const columns =
    gridWidth > 0 ? Math.max(1, Math.floor((gridWidth + COLUMN_GAP) / (MIN_COLUMN + COLUMN_GAP))) : 1;
  // Quantized so resizes do not re-render every PDF thumbnail over and over.
  const columnWidth =
    gridWidth > 0 ? Math.max(1, Math.round((gridWidth - (columns - 1) * COLUMN_GAP) / 8) * 8) : MIN_COLUMN;

  const nameById = new Map(sourceMeta.map(source => [source.id, source.name] as const));

  const clearDrag = () => {
    setDraggingId(null);
    setIndicator(null);
  };

  const dropOn = (targetId: string, side: 'before' | 'after') => {
    const from = draggingId ? pages.findIndex(page => page.id === draggingId) : -1;
    const target = pages.findIndex(page => page.id === targetId);
    if (from !== -1 && target !== -1) {
      const slot = side === 'after' ? target + 1 : target;
      vault.movePage(from, slot > from ? slot - 1 : slot);
    }
    clearDrag();
  };

  const dnd: CardDnd = {
    draggingId,
    indicator,
    onDragStart: (id, event) => {
      setDraggingId(id);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-vaultpdf-page', id);
      event.dataTransfer.setData('text/plain', id);
    },
    onDragOver: (id, event) => {
      if (!draggingId || draggingId === id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      setIndicator({
        targetId: id,
        side: event.clientX < rect.left + rect.width / 2 ? 'before' : 'after',
      });
    },
    onDrop: (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const side = indicator?.targetId === id ? indicator.side : 'after';
      dropOn(id, side);
    },
    onDragEnd: clearDrag,
  };

  const handleGridDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingId || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const last = pages[pages.length - 1];
    const lastElement = gridRef.current?.lastElementChild;
    if (last && lastElement && last.id !== draggingId) {
      const rect = lastElement.getBoundingClientRect();
      if (event.clientY > rect.bottom) setIndicator({ targetId: last.id, side: 'after' });
    }
  };

  const handleGridDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    event.preventDefault();
    if (indicator) dropOn(indicator.targetId, indicator.side);
    else clearDrag();
  };

  return (
    <div
      ref={gridRef}
      aria-label="Pages"
      className="grid px-3 pb-12 pt-3 sm:px-4"
      style={{ gap: COLUMN_GAP, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      onDragOver={handleGridDragOver}
      onDrop={handleGridDrop}
    >
      <AnimatePresence mode="popLayout">
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            page={page}
            order={index + 1}
            sourceName={nameById.get(page.sourceId) ?? 'Unknown file'}
            columnWidth={columnWidth}
            dnd={dnd}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
