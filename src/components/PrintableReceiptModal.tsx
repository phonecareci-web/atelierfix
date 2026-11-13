import React from 'react';
import { Printer, X } from 'lucide-react';
import { CurrencyCode, RepairTicket } from '../types/repair';
import { formatCurrency, formatDateTimeFr } from '../lib/statusConfig';

interface PrintableReceiptModalProps {
  ticket: RepairTicket | null;
  spreadsheetId: string;
  workshopTitle: string;
  currency: CurrencyCode;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  ticket,
  spreadsheetId,
  workshopTitle,
  currency,
  onClose,
}) => {
  if (!ticket) return null;

  const balanceDue = Math.max(0, ticket.estimatedCost - ticket.depositPaid);
  const trackingUrl = `${window.location.origin}/?sheetId=${encodeURIComponent(
    spreadsheetId
  )}&ticket=${encodeURIComponent(ticket.id)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Aperçu du bon de dépôt — {ticket.id}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950/60">
          {/* Paper sheet stays crisp white for accurate print preview */}
          <div
            id="printable-receipt"
            className="rounded-lg border border-slate-200 bg-white p-6 text-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="font-display text-xl font-bold text-slate-900">
                  AtelierFix
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {workshopTitle || 'Atelier de réparation mobile'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500">
                  Bon de dépôt
                </p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {ticket.id}
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {formatDateTimeFr(ticket.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">Client</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {ticket.clientName}
                </p>
                <p className="font-mono text-xs text-slate-700 tabular-nums">
                  {ticket.clientPhone}
                </p>
                {ticket.clientEmail && (
                  <p className="text-xs text-slate-600">{ticket.clientEmail}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Appareil</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {ticket.brand} {ticket.model}
                </p>
                <p className="font-mono text-xs text-slate-700 tabular-nums">
                  IMEI : {ticket.imei || 'Non communiqué'}
                </p>
                <p className="text-xs text-slate-600">
                  Restitution prévue : {ticket.dueDate || 'À confirmer'}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4 text-sm">
              <p className="text-xs font-semibold text-slate-500">
                Panne constatée / Demande
              </p>
              <p className="mt-1 text-slate-800">{ticket.reportedIssue}</p>
              {ticket.notes && (
                <p className="mt-2 text-xs text-slate-600">
                  Observations : {ticket.notes}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Devis estimé</p>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {formatCurrency(ticket.estimatedCost, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Acompte versé</p>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {formatCurrency(ticket.depositPaid, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reste à régler</p>
                <p className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrency(balanceDue, currency)}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p className="font-medium text-slate-700">
                Suivi de votre réparation en ligne :
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
                {trackingUrl}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 pt-2">
                <div className="border-t border-slate-300 pt-2">
                  Signature atelier
                </div>
                <div className="border-t border-slate-300 pt-2">
                  Signature client (bon pour accord)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
