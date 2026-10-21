import { motion } from 'motion/react';
import { Files, Plus } from '@phosphor-icons/react';
import { EASE } from '../lib/motion';

interface EmptyStateProps {
  importing: number;
  onAddFiles: () => void;
}

export function EmptyState({ importing, onAddFiles }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="w-full max-w-md rounded-2xl border border-dashed border-white/15 bg-panel px-8 py-12 text-center"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Files size={22} weight="bold" />
        </span>
        <h1 className="mt-5 text-lg font-medium text-neutral-100">Drop files to begin</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-neutral-400">
          Every page stays on this device. Arrange PDF pages and images, then export a new file.
        </p>
        <button
          type="button"
          onClick={onAddFiles}
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white transition duration-150 hover:bg-accent-strong active:scale-[0.98]"
        >
          <Plus size={15} weight="bold" />
          Add files
        </button>
        <p className="mt-3 text-xs text-neutral-500">or drop files anywhere in this window</p>
        {importing > 0 && (
          <p className="mt-4 font-mono text-xs text-neutral-400">
            Reading {importing} {importing === 1 ? 'file' : 'files'}
          </p>
        )}
      </motion.div>
    </div>
  );
}
