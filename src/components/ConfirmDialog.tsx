interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-primary-600 hover:bg-primary-700 text-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
