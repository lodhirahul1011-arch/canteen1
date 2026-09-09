import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const t = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!isVisible && !open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col transition-all duration-200 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
