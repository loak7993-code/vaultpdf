import { AnimatePresence, motion } from 'motion/react';
import { Warning, X } from '@phosphor-icons/react';
import { vault, type Notice } from '../state/store';
import { EASE } from '../lib/motion';

export function Notices({ notices }: { notices: readonly Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="px-3 pt-3 sm:px-4">
      <AnimatePresence initial={false}>
        {notices.map(notice => (
          <motion.div
            key={notice.id}
            layout
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mb-2 flex items-start gap-2.5 rounded-lg bg-panel2 px-3 py-2.5"
          >
            <Warning size={15} weight="bold" className="mt-px shrink-0 text-danger" />
            <p className="min-w-0 flex-1 break-words text-xs leading-5 text-neutral-200">{notice.text}</p>
            <button
              type="button"
              aria-label="Dismiss notice"
              onClick={() => vault.dismissNotice(notice.id)}
              className="mt-px shrink-0 rounded-md p-0.5 text-neutral-500 transition-colors hover:text-neutral-200"
            >
              <X size={13} weight="bold" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
