export type RepairStatus =
  | 'Reçu'
  | 'En diagnostic'
  | 'En attente pièce'
  | 'En réparation'
  | 'Prêt'
  | 'Livré'
  | 'Annulé';

export type RepairPriority = 'Normale' | 'Urgente' | 'Express 2h';

export interface RepairTicket {
  id: string;
  rowIndex: number; // 1-based row index in Google Sheets
  createdAt: string; // ISO string or formatted date
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  brand: string;
  model: string;
  imei: string;
  passcode: string;
  reportedIssue: string;
  technicianDiagnosis: string;
  status: RepairStatus;
  priority: RepairPriority;
  technician: string;
  estimatedCost: number;
  depositPaid: number;
  dueDate: string;
  updatedAt: string;
  notes: string;
}

export interface RepairFormInput {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  brand: string;
  model: string;
  imei: string;
  passcode: string;
  reportedIssue: string;
  technicianDiagnosis: string;
  status: RepairStatus;
  priority: RepairPriority;
  technician: string;
  estimatedCost: number;
  depositPaid: number;
  dueDate: string;
  notes: string;
}

export interface HistoryEntry {
  timestamp: string;
  ticketId: string;
  previousStatus: string;
  newStatus: string;
  author: string;
  note: string;
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface WorkshopDatabase {
  spreadsheetId: string;
  title: string;
  repairsSheetTitle: string;
  historySheetTitle: string;
  repairsSheetId: number;
  webViewLink: string;
}

export interface PendingConfirmation {
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
}

export const REPAIR_STATUS_ORDER: RepairStatus[] = [
  'Reçu',
  'En diagnostic',
  'En attente pièce',
  'En réparation',
  'Prêt',
  'Livré',
  'Annulé',
];

export const ACTIVE_PIPELINE_STATUSES: RepairStatus[] = [
  'Reçu',
  'En diagnostic',
  'En attente pièce',
  'En réparation',
  'Prêt',
];

export const PHONE_BRANDS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Google Pixel',
  'Oppo',
  'Huawei',
  'OnePlus',
  'Sony',
  'Autre',
];

export type CurrencyCode =
  | 'EUR'
  | 'XOF'
  | 'XAF'
  | 'USD'
  | 'CAD'
  | 'CHF'
  | 'GBP'
  | 'MAD'
  | 'TND'
  | 'DZD'
  | 'GNF';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)', decimals: 2 },
  { code: 'XOF', symbol: 'F CFA', label: 'Franc CFA BCEAO (F CFA)', decimals: 0 },
  { code: 'XAF', symbol: 'F CFA', label: 'Franc CFA BEAC (F CFA)', decimals: 0 },
  { code: 'USD', symbol: '$', label: 'Dollar US ($)', decimals: 2 },
  { code: 'CAD', symbol: '$ CA', label: 'Dollar canadien ($ CA)', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', label: 'Franc suisse (CHF)', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'Livre sterling (£)', decimals: 2 },
  { code: 'MAD', symbol: 'DH', label: 'Dirham marocain (DH)', decimals: 2 },
  { code: 'TND', symbol: 'DT', label: 'Dinar tunisien (DT)', decimals: 3 },
  { code: 'DZD', symbol: 'DA', label: 'Dinar algérien (DA)', decimals: 2 },
  { code: 'GNF', symbol: 'FG', label: 'Franc guinéen (FG)', decimals: 0 },
];

