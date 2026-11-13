import {
  CurrencyCode,
  CurrencyConfig,
  RepairPriority,
  RepairStatus,
  SUPPORTED_CURRENCIES,
} from '../types/repair';

export interface StatusMeta {
  label: RepairStatus;
  textClass: string;
  bgClass: string;
  borderClass: string;
  shortDesc: string;
}

export const STATUS_META: Record<RepairStatus, StatusMeta> = {
  Reçu: {
    label: 'Reçu',
    textClass: 'text-slate-700 dark:text-slate-200',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    borderClass: 'border-slate-200 dark:border-slate-700',
    shortDesc: 'Appareil enregistré au comptoir',
  },
  'En diagnostic': {
    label: 'En diagnostic',
    textClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    borderClass: 'border-blue-200 dark:border-blue-800',
    shortDesc: 'Analyse technique en cours',
  },
  'En attente pièce': {
    label: 'En attente pièce',
    textClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-50 dark:bg-amber-950/60',
    borderClass: 'border-amber-200 dark:border-amber-800',
    shortDesc: 'Commande fournisseur en cours',
  },
  'En réparation': {
    label: 'En réparation',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/60',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    shortDesc: 'Intervention technicien active',
  },
  Prêt: {
    label: 'Prêt',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    shortDesc: 'Tests OK — client à prévenir',
  },
  Livré: {
    label: 'Livré',
    textClass: 'text-slate-600 dark:text-slate-400',
    bgClass: 'bg-slate-50 dark:bg-slate-800/50',
    borderClass: 'border-slate-200 dark:border-slate-700',
    shortDesc: 'Appareil restitué au client',
  },
  Annulé: {
    label: 'Annulé',
    textClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 dark:bg-red-950/60',
    borderClass: 'border-red-200 dark:border-red-800',
    shortDesc: 'Intervention annulée / refusée',
  },
};

export function getPriorityLabel(priority: RepairPriority): {
  label: string;
  className: string;
} {
  switch (priority) {
    case 'Express 2h':
      return {
        label: 'Express 2h',
        className: 'text-red-700 dark:text-red-400 font-semibold',
      };
    case 'Urgente':
      return {
        label: 'Urgente',
        className: 'text-amber-700 dark:text-amber-400 font-semibold',
      };
    default:
      return {
        label: 'Normale',
        className: 'text-slate-500 dark:text-slate-400 font-normal',
      };
  }
}

export function getCurrencyConfig(code: CurrencyCode): CurrencyConfig {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0]
  );
}

export function getCurrencySymbol(code: CurrencyCode): string {
  return getCurrencyConfig(code).symbol;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EUR'
): string {
  const cfg = getCurrencyConfig(currency);
  const value = amount || 0;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    }).format(value);
  } catch {
    return `${value.toFixed(cfg.decimals)} ${cfg.symbol}`;
  }
}

export function formatDateTimeFr(isoOrString: string): string {
  if (!isoOrString) return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return isoOrString;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShortFr(isoOrString: string): string {
  if (!isoOrString) return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return isoOrString;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}
