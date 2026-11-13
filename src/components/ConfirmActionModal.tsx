import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { PendingConfirmation } from '../types/repair';

interface ConfirmActionModalProps {
  pending: PendingConfirmation | null;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  pending,
  onCancel,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!pending) return null;

  const isDanger = pending.variant === 'danger';

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      await pending.onConfirm();
      onCancel();
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                isDanger
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
                  : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {pending.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {pending.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {pending.details && pending.details.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200">
            {pending.details.map((detail, i) => (
              <li key={i} className="leading-relaxed">
                {detail}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
            }`}
          >
            {isExecuting ? 'Enregistrement...' : pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
