import React from 'react';
import { ArrowUpRight, Plus, Smartphone } from 'lucide-react';
import { CurrencyCode, RepairTicket } from '../types/repair';
import { StatusIndicator } from './StatusIndicator';
import {
  formatCurrency,
  formatDateShortFr,
  getPriorityLabel,
} from '../lib/statusConfig';

interface RepairsTableProps {
  tickets: RepairTicket[];
  currency: CurrencyCode;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onSelectTicket: (ticket: RepairTicket) => void;
  onNewTicket: () => void;
  onResetFilters: () => void;
}

export const RepairsTable: React.FC<RepairsTableProps> = ({
  tickets,
  currency,
  isLoading,
  hasActiveFilters,
  onSelectTicket,
  onNewTicket,
  onResetFilters,
}) => {
  if (isLoading && tickets.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          Chargement des réparations...
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <Smartphone className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          {hasActiveFilters
            ? 'Aucune réparation ne correspond à votre recherche'
            : 'Aucun téléphone enregistré pour le moment'}
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {hasActiveFilters
            ? 'Modifiez vos critères de recherche ou réinitialisez les filtres pour afficher tous les dossiers.'
            : 'Enregistrez le premier appareil déposé par un client. La fiche sera ajoutée instantanément à votre base.'}
        </p>
        <div className="mt-6">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewTicket}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Enregistrer un téléphone</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <th className="whitespace-nowrap px-4 py-3">Ticket</th>
              <th className="whitespace-nowrap px-4 py-3">Client</th>
              <th className="whitespace-nowrap px-4 py-3">Appareil</th>
              <th className="whitespace-nowrap px-4 py-3">Panne signalée</th>
              <th className="whitespace-nowrap px-4 py-3">Statut</th>
              <th className="whitespace-nowrap px-4 py-3">Priorité</th>
              <th className="whitespace-nowrap px-4 py-3">Prévu</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">
                Devis
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right">
                Détail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((ticket) => {
              const priority = getPriorityLabel(ticket.priority);
              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {ticket.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {ticket.clientName}
                    </div>
                    <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {ticket.clientPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {ticket.brand} {ticket.model}
                    </div>
                    {ticket.imei && (
                      <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {ticket.imei}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-slate-700 dark:text-slate-300">
                      {ticket.reportedIssue}
                    </p>
                    {ticket.technician && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Tech : {ticket.technician}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusIndicator status={ticket.status} compact />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <span className={priority.className}>{priority.label}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600 tabular-nums dark:text-slate-300">
                    {ticket.dueDate || formatDateShortFr(ticket.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {formatCurrency(ticket.estimatedCost, currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTicket(ticket);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
                    >
                      <span>Ouvrir</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
