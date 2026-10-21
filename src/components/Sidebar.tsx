import { useEffect } from 'react';
import { FilePdf, Image, X } from '@phosphor-icons/react';
import pkg from '../../package.json';
import { useVault, vault, type SourceMeta } from '../state/store';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SourceRow({ source }: { source: SourceMeta }) {
  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
      {source.kind === 'pdf' ? (
        <FilePdf size={15} weight="bold" className="shrink-0 text-neutral-400" />
      ) : (
        <Image size={15} weight="bold" className="shrink-0 text-neutral-400" />
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-neutral-200" title={source.name}>
        {source.name}
      </span>
      <span className="shrink-0 font-mono text-[11px] text-neutral-500">
        {source.pageCount === 1 ? '1 page' : `${source.pageCount} pages`}
      </span>
      <button
        type="button"
        aria-label={`Remove ${source.name}`}
        onClick={() => vault.removeSource(source.id)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-neutral-500 opacity-0 transition-opacity hover:text-neutral-200 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X size={12} weight="bold" />
      </button>
    </li>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { sources, online } = useVault();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        aria-label="Files"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 bg-[#0c0c0e] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <FilePdf size={18} weight="bold" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">VaultPDF</span>
          <button
            type="button"
            aria-label="Close files panel"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        <div className="px-4 pb-1.5 text-xs font-medium text-neutral-500">Files</div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sources.length === 0 ? (
            <p className="px-2 py-3 text-xs leading-5 text-neutral-500">
              No files yet. Add PDFs or images and their pages show up here.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sources.map(source => (
                <SourceRow key={source.id} source={source} />
              ))}
            </ul>
          )}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <span
            aria-label={online ? 'Network online' : 'Network offline'}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-warn' : 'bg-ok'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
          <p className="mt-2.5 text-[11px] leading-4 text-neutral-500">
            Version {pkg.version}. Zero uploads. Files never leave this device.
          </p>
        </div>
      </aside>
    </>
  );
}
