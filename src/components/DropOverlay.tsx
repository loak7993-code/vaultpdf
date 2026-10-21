import { UploadSimple } from '@phosphor-icons/react';

export function DropOverlay({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-canvas/85 backdrop-blur-sm" />
      <div
        className={`relative flex w-full max-w-md flex-col items-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-transform duration-200 ${
          active ? 'scale-100 border-accent/70' : 'scale-95 border-white/15'
        }`}
      >
        <UploadSimple size={28} weight="bold" className="text-accent" />
        <p className="mt-4 text-base font-medium text-neutral-100">Drop to add files</p>
        <p className="mt-1 text-xs text-neutral-400">PDF, PNG or JPG</p>
      </div>
    </div>
  );
}
