import { modalClasses, overlayClasses } from '@styles/classes';
import { useEffect, useRef, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Delete', cancelLabel = 'Cancel', loading = false }: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const el = dialogRef.current;
    // focus first focusable element
    const focusable = el?.querySelector<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      // basic trap: loop focus inside dialog
      if (e.key === 'Tab') {
        const focusableEls = el?.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!focusableEls || focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousActive?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const effectiveLoading = loading || internalLoading;

  return (
    <div className={`${overlayClasses} flex items-center justify-center`} role="dialog" aria-modal="true">
      <div ref={dialogRef} className={`${modalClasses} w-full max-w-md`} aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        {title && <h3 id="confirm-title" className="text-lg font-medium text-brand-70 dark:text-brand-30 mb-4">{title}</h3>}
        {message && <p id="confirm-desc" className="text-sm text-gray-70 dark:text-gray-30 mb-4">{message}</p>}
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={effectiveLoading}>{cancelLabel}</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={effectiveLoading}>{effectiveLoading ? `${confirmLabel}...` : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
