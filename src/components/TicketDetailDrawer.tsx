import React, { useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Phone,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import {
  CurrencyCode,
  HistoryEntry,
  REPAIR_STATUS_ORDER,
  RepairStatus,
  RepairTicket,
} from '../types/repair';
import { StatusIndicator } from './StatusIndicator';
import {
  formatCurrency,
  formatDateTimeFr,
  getPriorityLabel,
} from '../lib/statusConfig';

interface TicketDetailDrawerProps {
  ticket: RepairTicket | null;
  history: HistoryEntry[];
  spreadsheetId: string;
  currency: CurrencyCode;
  onClose: () => void;
  onEdit: (ticket: RepairTicket) => void;
  onQuickStatusChange: (ticket: RepairTicket, nextStatus: RepairStatus) => void;
  onDelete: (ticket: RepairTicket) => void;
  onOpenReceipt: (ticket: RepairTicket) => void;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  history,
  spreadsheetId,
  currency,
  onClose,
  onEdit,
  onQuickStatusChange,
  onDelete,
  onOpenReceipt,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!ticket) return null;

  const ticketHistory = history.filter((h) => h.ticketId === ticket.id);
  const balanceDue = Math.max(0, ticket.estimatedCost - ticket.depositPaid);
  const priorityMeta = getPriorityLabel(ticket.priority);

  const shareUrl = `${window.location.origin}/?sheetId=${encodeURIComponent(
    spreadsheetId
  )}&ticket=${encodeURIComponent(ticket.id)}`;

  const handleCopyTicketLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/50 backdrop-blur-[1px] dark:bg-slate-950/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-ticket-title"
    >
      <div className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span
                id="drawer-ticket-title"
                className="font-mono text-base font-semibold text-slate-900 tabular-nums dark:text-slate-100"
              >
                {ticket.id}
              </span>
              <StatusIndicator status={ticket.status} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              {ticket.brand} {ticket.model} ·{' '}
              <span className={priorityMeta.className}>
                Priorité {priorityMeta.label}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer le panneau"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => onEdit(ticket)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Modifier la fiche</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReceipt(ticket)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Bon de dépôt</span>
          </button>
          <button
            type="button"
            onClick={handleCopyTicketLink}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  Lien copié
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copier lien ticket</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(ticket)}
            className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Supprimer</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Quick Status Switcher */}
          <section>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Changer l'étape en temps réel
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {REPAIR_STATUS_ORDER.map((st) => {
                const isActive = ticket.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isActive}
                    onClick={() => onQuickStatusChange(ticket, st)}
                    className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'cursor-default border-blue-700 bg-blue-700 text-white dark:border-blue-600 dark:bg-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Client & Device Grid */}
          <section className="grid gap-6 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Client
              </h3>
              <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {ticket.clientName}
              </p>
              <a
                href={`tel:${ticket.clientPhone}`}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-blue-700 tabular-nums hover:underline dark:text-blue-400"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{ticket.clientPhone}</span>
              </a>
              {ticket.clientEmail && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {ticket.clientEmail}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Informations appareil
              </h3>
              <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {ticket.brand} {ticket.model}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                IMEI : {ticket.imei || 'Non renseigné'}
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                Code verrou : {ticket.passcode || 'Aucun'}
              </p>
            </div>
          </section>

          {/* Panne & Diagnostic */}
          <section className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Panne signalée
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {ticket.reportedIssue || '—'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Diagnostic technicien
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {ticket.technicianDiagnosis ||
                  'Aucun diagnostic technique saisi pour le moment.'}
              </p>
            </div>

            {ticket.notes && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Notes & état esthétique
                </h3>
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {ticket.notes}
                </p>
              </div>
            )}
          </section>

          {/* Financial & Schedule Summary */}
          <section className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coût estimé
              </p>
              <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatCurrency(ticket.estimatedCost, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompte
              </p>
              <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatCurrency(ticket.depositPaid, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reste à régler
              </p>
              <p className="mt-1 font-mono text-base font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                {formatCurrency(balanceDue, currency)}
              </p>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 tabular-nums dark:border-slate-800 dark:text-slate-400">
            <span>Déposé le {formatDateTimeFr(ticket.createdAt)}</span>
            <span>Technicien : {ticket.technician || 'Non assigné'}</span>
            <span>Prévu le : {ticket.dueDate || '—'}</span>
          </section>

          {/* History Timeline */}
          <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Historique des mouvements ({ticketHistory.length})
            </h3>
            {ticketHistory.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Aucune entrée d'historique enregistrée.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {ticketHistory.map((entry, idx) => (
                  <li
                    key={`${entry.timestamp}-${idx}`}
                    className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-xs last:border-none dark:border-slate-800"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {entry.previousStatus} → {entry.newStatus}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                          {entry.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-slate-400 dark:text-slate-500">
                        Par {entry.author || 'Atelier'}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                      {formatDateTimeFr(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
