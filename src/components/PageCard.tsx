import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowClockwise, Check, Trash, Warning } from '@phosphor-icons/react';
import { sources } from '../core/sources';
import { containRect, renderPageToCanvas } from '../core/thumbs';
import { useVault, vault, type PageItem } from '../state/store';
import { EASE } from '../lib/motion';
import type { CardDnd } from './PageGrid';

const THUMB_HEIGHT = 240;

interface PageCardProps {
  page: PageItem;
  order: number;
  sourceName: string;
  columnWidth: number;
  dnd: CardDnd;
}

export function PageCard({ page, order, sourceName, columnWidth, dnd }: PageCardProps) {
  const { selection } = useVault();
  const selected = selection.includes(page.id);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const entry = sources.get(page.sourceId);
    if (!entry) {
      setFailed(true);
      return;
    }

    if (page.kind === 'image') {
      if (entry.kind !== 'image') {
        setFailed(true);
        return;
      }
      const url = URL.createObjectURL(new Blob([new Uint8Array(entry.bytes)], { type: entry.mime }));
      setImageUrl(url);
      setFailed(false);
      return () => URL.revokeObjectURL(url);
    }

    if (entry.kind !== 'pdf' || !canvasRef.current) {
      setFailed(true);
      return;
    }
    const canvas = canvasRef.current;
    const handle = renderPageToCanvas(
      entry.jsDoc,
      page.pageIndex,
      canvas,
      columnWidth,
      THUMB_HEIGHT,
      Math.min(window.devicePixelRatio || 1, 2),
    );
    let cancelled = false;
    handle.promise.then(
      () => {
        if (!cancelled) {
          setRendered(true);
          setFailed(false);
        }
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [visible, attempt, page.kind, page.sourceId, page.pageIndex, columnWidth]);

  const displayed = containRect(page.width, page.height, columnWidth, THUMB_HEIGHT);
  const quarterTurn = page.rotation === 90 || page.rotation === 270;
  const fitScale = quarterTurn
    ? Math.min(columnWidth / displayed.height, THUMB_HEIGHT / displayed.width, 1)
    : 1;
  const mediaStyle: CSSProperties = {
    width: displayed.width,
    height: displayed.height,
    transform: `rotate(${page.rotation}deg) scale(${fitScale})`,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        layout: { duration: 0.28, ease: EASE },
        default: { duration: 0.28, ease: EASE, delay: Math.min(order * 0.03, 0.3) },
      }}
      role="checkbox"
      aria-checked={selected}
      aria-label={`Page ${order} from ${sourceName}`}
      tabIndex={0}
      onClick={event =>
        vault.clickPage(page.id, { shiftKey: event.shiftKey, metaKey: event.metaKey || event.ctrlKey })
      }
      onKeyDown={event => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          vault.clickPage(page.id, { shiftKey: event.shiftKey, metaKey: event.metaKey || event.ctrlKey });
        } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          vault.nudgePage(page.id, event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
      className={`group relative cursor-pointer rounded-xl bg-panel p-1.5 transition-[background-color,opacity] duration-150 select-none hover:bg-panel2 ${
        selected ? 'ring-2 ring-accent' : ''
      } ${dnd.draggingId === page.id ? 'opacity-40' : ''}`}
    >
      {/* The draggable surface sits on a plain element because motion redefines onDrop. */}
      <div
        draggable
        onDragStart={event => dnd.onDragStart(page.id, event)}
        onDragOver={event => dnd.onDragOver(page.id, event)}
        onDrop={event => dnd.onDrop(page.id, event)}
        onDragEnd={dnd.onDragEnd}
      >
        <div
          ref={boxRef}
          className="relative flex h-[240px] items-center justify-center overflow-hidden rounded-lg bg-[#0b0b0d]"
        >
          {!rendered && !failed && <div className="skeleton absolute inset-0" aria-hidden="true" />}
          {page.kind === 'pdf' ? (
            <canvas ref={canvasRef} style={mediaStyle} className="block" aria-hidden="true" />
          ) : (
            imageUrl && (
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={() => setRendered(true)}
                onError={() => setFailed(true)}
                style={mediaStyle}
                className="block"
              />
            )
          )}
          {failed && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-panel2">
              <Warning size={16} weight="bold" className="text-warn" />
              <p className="text-[11px] text-neutral-400">Preview failed</p>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setFailed(false);
                  setAttempt(attempt + 1);
                }}
                onKeyDown={event => event.stopPropagation()}
                className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-200 transition-colors hover:bg-white/[0.08]"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-1.5 pb-0.5 pt-2">
          <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-500">{sourceName}</span>
          <span className="shrink-0 font-mono text-[11px] text-neutral-400">{order}</span>
        </div>
      </div>

      {selected && (
        <span className="absolute left-2.5 top-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-md bg-accent text-white">
          <Check size={12} weight="bold" />
        </span>
      )}
      <div className="absolute right-2.5 top-2.5 z-20 flex gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          aria-label={`Rotate page ${order}`}
          onClick={event => {
            event.stopPropagation();
            vault.rotatePages([page.id], 1);
          }}
          onKeyDown={event => event.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-canvas/80 text-neutral-300 transition-colors hover:text-white"
        >
          <ArrowClockwise size={13} weight="bold" />
        </button>
        <button
          type="button"
          aria-label={`Delete page ${order}`}
          onClick={event => {
            event.stopPropagation();
            vault.deletePages([page.id]);
          }}
          onKeyDown={event => event.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-canvas/80 text-neutral-300 transition-colors hover:text-white"
        >
          <Trash size={13} weight="bold" />
        </button>
      </div>

      {dnd.indicator?.targetId === page.id && (
        <span
          aria-hidden="true"
          className={`absolute top-1 bottom-1 z-30 w-0.5 rounded-full bg-accent ${
            dnd.indicator.side === 'before' ? '-left-[7px]' : '-right-[7px]'
          }`}
        />
      )}
    </motion.div>
  );
}
