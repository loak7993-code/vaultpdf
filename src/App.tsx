import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { DropOverlay } from './components/DropOverlay';
import { EmptyState } from './components/EmptyState';
import { Notices } from './components/Notices';
import { PageGrid } from './components/PageGrid';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { useVault, vault } from './state/store';

const GLOW_BACKGROUND =
  'radial-gradient(720px 480px at 12% -8%, rgba(53, 132, 228, 0.09), transparent 65%), radial-gradient(560px 420px at 96% 104%, rgba(53, 132, 228, 0.06), transparent 60%)';

export default function App() {
  const state = useVault();
  const [navOpen, setNavOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  useEffect(() => {
    const sync = () => vault.setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent): boolean =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragActive(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragActive(false);
    };
    const onDrop = (event: DragEvent) => {
      depth = 0;
      setDragActive(false);
      if (!hasFiles(event)) return;
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) void vault.addFiles(files);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-canvas font-sans text-neutral-100 antialiased">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0"
          style={{ background: GLOW_BACKGROUND }}
        />
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={event => {
            const files = event.currentTarget.files;
            if (files && files.length > 0) void vault.addFiles(files);
            event.currentTarget.value = '';
          }}
        />
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex min-h-dvh flex-col lg:pl-60">
          <Toolbar onToggleNav={() => setNavOpen(true)} onAddFiles={openPicker} />
          <main className="flex min-w-0 flex-1 flex-col">
            <Notices notices={state.notices} />
            {state.pages.length === 0 ? (
              <EmptyState importing={state.importing} onAddFiles={openPicker} />
            ) : (
              <PageGrid pages={state.pages} />
            )}
          </main>
        </div>
        <DropOverlay active={dragActive} />
      </div>
    </MotionConfig>
  );
}
