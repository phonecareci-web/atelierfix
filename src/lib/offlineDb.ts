import {
  CurrencyCode,
  HistoryEntry,
  RepairFormInput,
  RepairTicket,
  WorkshopDatabase,
} from '../types/repair';

const DB_NAME = 'atelierfix_offline_v1';
const DB_VERSION = 1;

const STORE_TICKETS = 'tickets';
const STORE_HISTORY = 'history';
const STORE_META = 'meta';
const STORE_QUEUE = 'syncQueue';

export interface OfflineSyncOperation {
  opId: string;
  type: 'create' | 'update' | 'delete';
  ticketId: string;
  timestamp: string;
  author: string;
  input?: RepairFormInput;
  note?: string;
}

export const LOCAL_WORKSHOP_DB: WorkshopDatabase = {
  spreadsheetId: 'local-offline',
  title: 'Base locale hors ligne (IndexedDB)',
  repairsSheetTitle: 'Réparations',
  historySheetTitle: 'Historique',
  repairsSheetId: 0,
  webViewLink: '',
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TICKETS)) {
        db.createObjectStore(STORE_TICKETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'localKey' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'opId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let reqResult: T | undefined;
        const req = fn(store);
        if (req) {
          req.onsuccess = () => {
            reqResult = req.result;
          };
        }
        tx.oncomplete = () => {
          db.close();
          resolve(reqResult as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

export async function getOfflineTickets(): Promise<RepairTicket[]> {
  const list = await txPromise<RepairTicket[]>(
    STORE_TICKETS,
    'readonly',
    (store) => store.getAll()
  );
  return (list || []).sort((a, b) => {
    const da = new Date(a.createdAt).getTime() || 0;
    const db = new Date(b.createdAt).getTime() || 0;
    return db - da;
  });
}

export async function saveOfflineTicketsSnapshot(
  tickets: RepairTicket[]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    store.clear();
    for (const t of tickets) {
      store.put(t);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineHistory(): Promise<HistoryEntry[]> {
  const list = await txPromise<Array<HistoryEntry & { localKey: string }>>(
    STORE_HISTORY,
    'readonly',
    (store) => store.getAll()
  );
  return (list || [])
    .map(({ localKey: _ignored, ...rest }) => rest)
    .sort((a, b) => {
      const da = new Date(a.timestamp).getTime() || 0;
      const db = new Date(b.timestamp).getTime() || 0;
      return db - da;
    });
}

export async function saveOfflineHistorySnapshot(
  entries: HistoryEntry[]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.clear();
    entries.forEach((entry, i) => {
      store.put({
        ...entry,
        localKey: `${entry.timestamp}-${entry.ticketId}-${i}`,
      });
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveActiveDbMeta(dbMeta: WorkshopDatabase): Promise<void> {
  await txPromise(STORE_META, 'readwrite', (store) =>
    store.put({ key: 'activeDb', value: dbMeta })
  );
}

export async function getSavedDbMeta(): Promise<WorkshopDatabase | null> {
  const record = await txPromise<{ key: string; value: WorkshopDatabase } | undefined>(
    STORE_META,
    'readonly',
    (store) => store.get('activeDb')
  );
  return record?.value || null;
}

export async function saveCurrencyPreference(
  currency: CurrencyCode
): Promise<void> {
  await txPromise(STORE_META, 'readwrite', (store) =>
    store.put({ key: 'currency', value: currency })
  );
}

export async function getSavedCurrencyPreference(): Promise<CurrencyCode> {
  const record = await txPromise<{ key: string; value: CurrencyCode } | undefined>(
    STORE_META,
    'readonly',
    (store) => store.get('currency')
  );
  return record?.value || 'EUR';
}

export async function saveThemePreference(
  theme: 'light' | 'dark'
): Promise<void> {
  await txPromise(STORE_META, 'readwrite', (store) =>
    store.put({ key: 'theme', value: theme })
  );
}

export async function getSavedThemePreference(): Promise<'light' | 'dark' | null> {
  const record = await txPromise<{ key: string; value: 'light' | 'dark' } | undefined>(
    STORE_META,
    'readonly',
    (store) => store.get('theme')
  );
  return record?.value || null;
}

export async function getSyncQueue(): Promise<OfflineSyncOperation[]> {
  const list = await txPromise<OfflineSyncOperation[]>(
    STORE_QUEUE,
    'readonly',
    (store) => store.getAll()
  );
  return (list || []).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function enqueueSyncOperation(
  op: OfflineSyncOperation
): Promise<void> {
  await txPromise(STORE_QUEUE, 'readwrite', (store) => store.put(op));
}

export async function clearSyncQueue(): Promise<void> {
  await txPromise(STORE_QUEUE, 'readwrite', (store) => store.clear());
}

export async function removeSyncOperation(opId: string): Promise<void> {
  await txPromise(STORE_QUEUE, 'readwrite', (store) => store.delete(opId));
}

function generateLocalTicketId(existing: RepairTicket[]): string {
  const yearSuffix = String(new Date().getFullYear()).slice(-2);
  let maxNum = 0;
  for (const t of existing) {
    const match = t.id.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum && n < 100000) maxNum = n;
    }
  }
  const next = String(maxNum + 1).padStart(3, '0');
  return `REP-${yearSuffix}-${next}`;
}

export async function createOfflineTicket(
  input: RepairFormInput,
  author: string,
  queueForSheets: boolean
): Promise<{ ticket: RepairTicket; historyEntry: HistoryEntry }> {
  const existing = await getOfflineTickets();
  const id = generateLocalTicketId(existing);
  const nowIso = new Date().toISOString();

  const ticket: RepairTicket = {
    id,
    rowIndex: existing.length + 2,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...input,
  };

  const historyEntry: HistoryEntry = {
    timestamp: nowIso,
    ticketId: id,
    previousStatus: 'Nouveau dépôt',
    newStatus: input.status,
    author,
    note: `${input.brand} ${input.model} — ${input.reportedIssue}`.trim(),
  };

  await txPromise(STORE_TICKETS, 'readwrite', (store) => store.put(ticket));
  await txPromise(STORE_HISTORY, 'readwrite', (store) =>
    store.put({
      ...historyEntry,
      localKey: `${nowIso}-${id}-${Math.random().toString(36).slice(2, 7)}`,
    })
  );

  if (queueForSheets) {
    await enqueueSyncOperation({
      opId: `${nowIso}-${id}-create`,
      type: 'create',
      ticketId: id,
      timestamp: nowIso,
      author,
      input,
    });
  }

  return { ticket, historyEntry };
}

export async function updateOfflineTicket(
  ticket: RepairTicket,
  updates: RepairFormInput,
  author: string,
  queueForSheets: boolean,
  note?: string
): Promise<RepairTicket> {
  const nowIso = new Date().toISOString();
  const updated: RepairTicket = {
    ...ticket,
    ...updates,
    updatedAt: nowIso,
  };

  await txPromise(STORE_TICKETS, 'readwrite', (store) => store.put(updated));

  if (ticket.status !== updates.status || note) {
    const entry: HistoryEntry = {
      timestamp: nowIso,
      ticketId: ticket.id,
      previousStatus: ticket.status,
      newStatus: updates.status,
      author,
      note:
        note ||
        (ticket.status !== updates.status
          ? `Statut modifié vers « ${updates.status} »`
          : 'Fiche mise à jour'),
    };
    await txPromise(STORE_HISTORY, 'readwrite', (store) =>
      store.put({
        ...entry,
        localKey: `${nowIso}-${ticket.id}-${Math.random().toString(36).slice(2, 7)}`,
      })
    );
  }

  if (queueForSheets) {
    await enqueueSyncOperation({
      opId: `${nowIso}-${ticket.id}-update`,
      type: 'update',
      ticketId: ticket.id,
      timestamp: nowIso,
      author,
      input: updates,
      note,
    });
  }

  return updated;
}

export async function deleteOfflineTicket(
  ticket: RepairTicket,
  author: string,
  queueForSheets: boolean
): Promise<void> {
  const nowIso = new Date().toISOString();
  await txPromise(STORE_TICKETS, 'readwrite', (store) =>
    store.delete(ticket.id)
  );

  const entry: HistoryEntry = {
    timestamp: nowIso,
    ticketId: ticket.id,
    previousStatus: ticket.status,
    newStatus: 'Supprimé',
    author,
    note: `Suppression du dossier ${ticket.clientName} (${ticket.brand} ${ticket.model})`,
  };
  await txPromise(STORE_HISTORY, 'readwrite', (store) =>
    store.put({
      ...entry,
      localKey: `${nowIso}-${ticket.id}-${Math.random().toString(36).slice(2, 7)}`,
    })
  );

  if (queueForSheets) {
    await enqueueSyncOperation({
      opId: `${nowIso}-${ticket.id}-delete`,
      type: 'delete',
      ticketId: ticket.id,
      timestamp: nowIso,
      author,
    });
  }
}

export function exportTicketsToCsv(
  tickets: RepairTicket[],
  currency: CurrencyCode = 'EUR'
): void {
  const headers = [
    'ID Ticket',
    'Date Dépôt',
    'Client',
    'Téléphone Client',
    'Email',
    'Marque',
    'Modèle',
    'IMEI / Série',
    'Code Verrou',
    'Panne Signalée',
    'Diagnostic Technicien',
    'Statut',
    'Priorité',
    'Technicien',
    `Coût Estimé (${currency})`,
    `Acompte (${currency})`,
    'Date Prévue',
    'Dernière MAJ',
    'Notes',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes('"') || str.includes(';') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = tickets.map((t) =>
    [
      t.id,
      t.createdAt,
      t.clientName,
      t.clientPhone,
      t.clientEmail,
      t.brand,
      t.model,
      t.imei,
      t.passcode,
      t.reportedIssue,
      t.technicianDiagnosis,
      t.status,
      t.priority,
      t.technician,
      t.estimatedCost,
      t.depositPaid,
      t.dueDate,
      t.updatedAt,
      t.notes,
    ]
      .map(escapeCsv)
      .join(';')
  );

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `atelierfix-reparations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
