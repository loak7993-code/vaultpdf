import type { ComponentType } from 'react';
import {
  ArrowClockwise,
  Broom,
  DownloadSimple,
  Export,
  List,
  Plus,
  Trash,
  type IconProps,
} from '@phosphor-icons/react';
import { useVault, vault } from '../state/store';

interface ToolButtonProps {
  icon: ComponentType<IconProps>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function ToolButton({ icon: Icon, label, onClick, disabled = false, primary = false }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
        primary
          ? 'bg-accent text-white hover:bg-accent-strong'
          : 'border border-white/10 bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08]'
      }`}
    >
      <Icon size={15} weight="bold" className="shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

export function Toolbar({ onToggleNav, onAddFiles }: { onToggleNav: () => void; onAddFiles: () => void }) {
  const { pages, selection, importing, exporting } = useVault();
  const selectedCount = selection.length;
  const hasPages = pages.length > 0;
  const busy = exporting !== null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/10 bg-canvas/85 px-3 backdrop-blur-md sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label="Open files panel"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
      >
        <List size={18} weight="bold" />
      </button>
      <div
        className={`min-w-0 whitespace-nowrap font-mono text-xs text-neutral-400 ${
          selectedCount > 0 ? 'hidden min-[460px]:block' : ''
        }`}
      >
        <span className="text-neutral-200">{pages.length}</span> {pages.length === 1 ? 'page' : 'pages'}
      </div>
      {selectedCount > 0 && (
        <div className="whitespace-nowrap font-mono text-xs text-accent">{selectedCount} selected</div>
      )}
      {importing > 0 && (
        <div className="hidden min-[460px]:block whitespace-nowrap text-xs text-neutral-500">
          Importing {importing}
        </div>
      )}
      {busy && <div className="hidden whitespace-nowrap text-xs text-neutral-500 sm:block">Exporting</div>}
      <div className="ml-auto flex items-center gap-1.5">
        <ToolButton
          icon={ArrowClockwise}
          label="Rotate"
          disabled={selectedCount === 0}
          onClick={() => vault.rotatePages(selection, 1)}
        />
        <ToolButton
          icon={Trash}
          label="Delete"
          disabled={selectedCount === 0}
          onClick={() => vault.deletePages(selection)}
        />
        <ToolButton
          icon={Export}
          label="Extract selection"
          disabled={selectedCount === 0 || busy}
          onClick={() => void vault.exportExtract()}
        />
        <ToolButton
          icon={DownloadSimple}
          label="Download merged"
          primary
          disabled={!hasPages || busy}
          onClick={() => void vault.exportMerged()}
        />
        <ToolButton icon={Broom} label="Clear all" disabled={!hasPages} onClick={() => vault.clearAll()} />
        <ToolButton icon={Plus} label="Add files" onClick={onAddFiles} />
      </div>
    </header>
  );
}
