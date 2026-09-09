import { Loader2 } from 'lucide-react';

export default function Loading({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 size={size} className="text-primary-500 animate-spin" />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Loader2 size={40} className="text-primary-500 animate-spin" />
    </div>
  );
}
