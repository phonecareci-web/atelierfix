import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import {
  ACTIVE_PIPELINE_STATUSES,
  CurrencyCode,
  RepairStatus,
  RepairTicket,
} from '../types/repair';
import {
  formatCurrency,
  formatDateShortFr,
  getPriorityLabel,
  STATUS_META,
} from '../lib/statusConfig';

interface KanbanBoardProps {
  tickets: RepairTicket[];
  currency: CurrencyCode;
  onSelectTicket: (ticket: RepairTicket) => void;
  onAdvanceStatus: (ticket: RepairTicket, nextStatus: RepairStatus) => void;
  onNewTicket: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  currency,
  onSelectTicket,
  onAdvanceStatus,
  onNewTicket,
}) => {
  return (
    <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
      {ACTIVE_PIPELINE_STATUSES.map((status, colIndex) => {
        const colTickets = tickets.filter((t) => t.status === status);
        const meta = STATUS_META[status];
        const nextStatus =
          colIndex < ACTIVE_PIPELINE_STATUSES.length - 1
            ? ACTIVE_PIPELINE_STATUSES[colIndex + 1]
            : 'Livré';

        return (
          <div
            key={status}
            className="flex min-w-[240px] flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className={`text-sm font-semibold ${meta.textClass}`}>
                  {meta.label}
                </h3>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {meta.shortDesc}
                </p>
              </div>
              <span className="ml-2 font-mono text-xs font-semibold text-slate-600 tabular-nums dark:text-slate-300">
                {colTickets.length}
              </span>
            </div>

            <div className="mt-3 flex flex-1 flex-col gap-2.5">
              {colTickets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/50 px-3 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Aucun dossier
                  </p>
                  {status === 'Reçu' && (
                    <button
                      type="button"
                      onClick={onNewTicket}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nouveau dépôt</span>
                    </button>
                  )}
                </div>
              ) : (
                colTickets.map((ticket) => {
                  const priority = getPriorityLabel(ticket.priority);
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectTicket(ticket);
                        }
                      }}
                      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                          {ticket.id}
                        </span>
                        <span className={`text-[11px] ${priority.className}`}>
                          {priority.label}
                        </span>
                      </div>

                      <p className="mt-1.5 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ticket.brand} {ticket.model}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                        {ticket.clientName} ·{' '}
                        <span className="font-mono tabular-nums">
                          {ticket.clientPhone}
                        </span>
                      </p>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {ticket.reportedIssue}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                        <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
                          {formatCurrency(ticket.estimatedCost, currency)} ·{' '}
                          {formatDateShortFr(ticket.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvanceStatus(ticket, nextStatus);
                          }}
                          title={`Passer à : ${nextStatus}`}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
                        >
                          <span>{nextStatus}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
