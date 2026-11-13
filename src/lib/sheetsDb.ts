import {
  DriveSpreadsheetFile,
  HistoryEntry,
  RepairFormInput,
  RepairPriority,
  RepairStatus,
  RepairTicket,
  WorkshopDatabase,
} from '../types/repair';
import { buildLauncherHtml } from './launcherGenerator';

export class WorkspaceApiError extends Error {
  status: number;
  isAuthError: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.isAuthError = status === 401;
  }
}

export const REPAIRS_HEADERS = [
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
  'Coût Estimé (€)',
  'Acompte (€)',
  'Date Prévue',
  'Dernière MAJ',
  'Notes',
];

export const HISTORY_HEADERS = [
  'Horodatage',
  'ID Ticket',
  'Ancien Statut',
  'Nouveau Statut',
  'Auteur',
  'Note',
];

async function apiFetch<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let errMsg = `Erreur API Google (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new WorkspaceApiError(errMsg, res.status);
  }

  return res.json() as Promise<T>;
}

function escapeSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

export function parseSheetIdFromInput(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Match Google Sheets URL: /spreadsheets/d/<ID>
  const sheetUrlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetUrlMatch) return sheetUrlMatch[1];

  // Match query parameter ?sheetId=<ID>
  try {
    const url = new URL(trimmed);
    const paramId = url.searchParams.get('sheetId');
    if (paramId) return paramId;
    const stateParam = url.searchParams.get('state');
    if (stateParam) {
      const parsed = JSON.parse(stateParam);
      if (Array.isArray(parsed?.ids) && parsed.ids[0]) {
        return String(parsed.ids[0]);
      }
    }
  } catch {
    // Not a URL, might be raw ID
  }

  // Raw Google ID pattern
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function findWorkshopDatabases(
  token: string
): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent(
    'files(id,name,modifiedTime,webViewLink,appProperties)'
  );
  const data = await apiFetch<{
    files: Array<DriveSpreadsheetFile & { appProperties?: Record<string, string> }>;
  }>(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`,
    token
  );

  const files = data.files || [];
  // Prioritize files tagged by AtelierFix
  return files.sort((a, b) => {
    const aTagged = a.appProperties?.app === 'atelierfix' ? 1 : 0;
    const bTagged = b.appProperties?.app === 'atelierfix' ? 1 : 0;
    return bTagged - aTagged;
  });
}

async function ensureWorkshopFolder(token: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='app' and value='atelierfix-folder' }"
    );
    const search = await apiFetch<{ files: Array<{ id: string }> }>(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&pageSize=1`,
      token
    );
    if (search.files && search.files.length > 0) {
      return search.files[0].id;
    }

    const created = await apiFetch<{ id: string }>(
      'https://www.googleapis.com/drive/v3/files',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'AtelierFix — Dossier Atelier',
          mimeType: 'application/vnd.google-apps.folder',
          appProperties: { app: 'atelierfix-folder' },
        }),
      }
    );
    return created.id;
  } catch {
    return null;
  }
}

export async function createWorkshopDatabase(
  token: string,
  workshopTitle = 'AtelierFix — Base Réparations'
): Promise<WorkshopDatabase> {
  const created = await apiFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: workshopTitle,
        locale: 'fr_FR',
      },
      sheets: [
        {
          properties: {
            title: 'Réparations',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Historique',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  const spreadsheetId = created.spreadsheetId;
  const repairsSheet = created.sheets[0].properties;
  const historySheet = created.sheets[1].properties;

  // Populate headers for both sheets
  await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${escapeSheetName(repairsSheet.title)}!A1:S1`,
            values: [REPAIRS_HEADERS],
          },
          {
            range: `${escapeSheetName(historySheet.title)}!A1:F1`,
            values: [HISTORY_HEADERS],
          },
        ],
      }),
    }
  );

  // Format header rows neatly in Google Sheets
  await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: repairsSheet.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: REPAIRS_HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 10,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: historySheet.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: HISTORY_HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 10,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      }),
    }
  );

  // Tag Drive file & organize inside workshop folder
  const folderId = await ensureWorkshopFolder(token);
  const patchParams = new URLSearchParams();
  if (folderId) {
    patchParams.set('addParents', folderId);
  }
  await apiFetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?${patchParams.toString()}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        appProperties: { app: 'atelierfix' },
      }),
    }
  );

  return {
    spreadsheetId,
    title: created.properties.title,
    repairsSheetTitle: repairsSheet.title,
    historySheetTitle: historySheet.title,
    repairsSheetId: repairsSheet.sheetId,
    webViewLink: created.spreadsheetUrl,
  };
}

export async function createDriveLauncherFile(
  token: string,
  spreadsheetId: string,
  appUrl: string
): Promise<{ id: string; webViewLink: string }> {
  const folderId = await ensureWorkshopFolder(token);
  const htmlContent = buildLauncherHtml({ appUrl, spreadsheetId });

  const metadata = {
    name: 'Ouvrir AtelierFix (Application Atelier).html',
    mimeType: 'text/html',
    ...(folderId ? { parents: [folderId] } : {}),
    appProperties: { app: 'atelierfix-launcher', sheetId: spreadsheetId },
  };

  const boundary = '-------atelierfix_boundary_920563';
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
    `${htmlContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    throw new WorkspaceApiError(
      'Impossible de créer le lanceur sur Google Drive.',
      res.status
    );
  }

  return res.json();
}

export async function loadDatabaseMetadata(
  token: string,
  spreadsheetId: string
): Promise<WorkshopDatabase> {
  // Always inspect spreadsheet metadata first rather than assuming 'Sheet1'
  const meta = await apiFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`,
    token
  );

  const sheets = meta.sheets || [];
  if (sheets.length === 0) {
    throw new Error('Ce classeur Google Sheets ne contient aucun onglet.');
  }

  const repairsSheet =
    sheets.find((s) => s.properties.title.toLowerCase() === 'réparations') ||
    sheets[0];

  let historySheet = sheets.find(
    (s) => s.properties.title.toLowerCase() === 'historique'
  );

  // Create Historique tab automatically if user opened an external sheet
  if (!historySheet) {
    try {
      const addRes = await apiFetch<{
        replies: Array<{
          addSheet: { properties: { sheetId: number; title: string } };
        }>;
      }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Historique',
                    gridProperties: { frozenRowCount: 1 },
                  },
                },
              },
            ],
          }),
        }
      );
      historySheet = {
        properties: addRes.replies[0].addSheet.properties,
      };
      await apiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          `${escapeSheetName(historySheet.properties.title)}!A1:F1`
        )}?valueInputOption=USER_ENTERED`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({ values: [HISTORY_HEADERS] }),
        }
      );
    } catch {
      // Fallback to repairs sheet title if history creation fails on read-only sheets
    }
  }

  // Ensure headers exist if first row of repairs sheet is empty
  const headerCheck = await apiFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${escapeSheetName(repairsSheet.properties.title)}!A1:S1`
    )}`,
    token
  );

  if (!headerCheck.values || headerCheck.values.length === 0) {
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `${escapeSheetName(repairsSheet.properties.title)}!A1:S1`
      )}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [REPAIRS_HEADERS] }),
      }
    );
  }

  return {
    spreadsheetId: meta.spreadsheetId,
    title: meta.properties.title,
    repairsSheetTitle: repairsSheet.properties.title,
    historySheetTitle: historySheet?.properties.title || '',
    repairsSheetId: repairsSheet.properties.sheetId,
    webViewLink: meta.spreadsheetUrl,
  };
}

function normalizeStatus(raw: string | undefined): RepairStatus {
  const val = (raw || '').trim();
  const valid: RepairStatus[] = [
    'Reçu',
    'En diagnostic',
    'En attente pièce',
    'En réparation',
    'Prêt',
    'Livré',
    'Annulé',
  ];
  return (valid.find((s) => s.toLowerCase() === val.toLowerCase()) ||
    'Reçu') as RepairStatus;
}

function normalizePriority(raw: string | undefined): RepairPriority {
  const val = (raw || '').trim();
  if (val.toLowerCase().includes('express')) return 'Express 2h';
  if (val.toLowerCase().includes('urgent')) return 'Urgente';
  return 'Normale';
}

export async function fetchRepairsAndHistory(
  token: string,
  db: WorkshopDatabase
): Promise<{ tickets: RepairTicket[]; history: HistoryEntry[] }> {
  const ranges = [`${escapeSheetName(db.repairsSheetTitle)}!A2:S`];
  if (db.historySheetTitle) {
    ranges.push(`${escapeSheetName(db.historySheetTitle)}!A2:F`);
  }

  const params = ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const data = await apiFetch<{
    valueRanges: Array<{ values?: string[][] }>;
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values:batchGet?${params}`,
    token
  );

  const repairRows = data.valueRanges?.[0]?.values || [];
  const tickets: RepairTicket[] = [];

  repairRows.forEach((row, idx) => {
    // Skip completely empty trailing rows
    if (!row || row.every((cell) => !String(cell || '').trim())) return;

    const rowIndex = idx + 2; // 1-based sheet row (row 1 is header)
    tickets.push({
      id: String(row[0] || `REP-${rowIndex}`).trim(),
      rowIndex,
      createdAt: String(row[1] || '').trim(),
      clientName: String(row[2] || '').trim(),
      clientPhone: String(row[3] || '').trim(),
      clientEmail: String(row[4] || '').trim(),
      brand: String(row[5] || '').trim(),
      model: String(row[6] || '').trim(),
      imei: String(row[7] || '').trim(),
      passcode: String(row[8] || '').trim(),
      reportedIssue: String(row[9] || '').trim(),
      technicianDiagnosis: String(row[10] || '').trim(),
      status: normalizeStatus(row[11]),
      priority: normalizePriority(row[12]),
      technician: String(row[13] || '').trim(),
      estimatedCost: Number(String(row[14] || '0').replace(',', '.')) || 0,
      depositPaid: Number(String(row[15] || '0').replace(',', '.')) || 0,
      dueDate: String(row[16] || '').trim(),
      updatedAt: String(row[17] || '').trim(),
      notes: String(row[18] || '').trim(),
    });
  });

  const historyRows = data.valueRanges?.[1]?.values || [];
  const history: HistoryEntry[] = historyRows
    .filter((row) => row && row.some((cell) => String(cell || '').trim()))
    .map((row) => ({
      timestamp: String(row[0] || '').trim(),
      ticketId: String(row[1] || '').trim(),
      previousStatus: String(row[2] || '').trim(),
      newStatus: String(row[3] || '').trim(),
      author: String(row[4] || '').trim(),
      note: String(row[5] || '').trim(),
    }))
    .reverse();

  // Sort tickets newest first
  tickets.sort((a, b) => b.rowIndex - a.rowIndex);

  return { tickets, history };
}

function generateNextTicketId(existing: RepairTicket[]): string {
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

export async function appendRepairTicket(
  token: string,
  db: WorkshopDatabase,
  input: RepairFormInput,
  authorEmail: string,
  existingTickets: RepairTicket[]
): Promise<string> {
  const ticketId = generateNextTicketId(existingTickets);
  const nowIso = new Date().toISOString();

  const rowValues = [
    ticketId,
    nowIso,
    input.clientName.trim(),
    input.clientPhone.trim(),
    input.clientEmail.trim(),
    input.brand.trim(),
    input.model.trim(),
    input.imei.trim(),
    input.passcode.trim(),
    input.reportedIssue.trim(),
    input.technicianDiagnosis.trim(),
    input.status,
    input.priority,
    input.technician.trim(),
    input.estimatedCost,
    input.depositPaid,
    input.dueDate.trim(),
    nowIso,
    input.notes.trim(),
  ];

  await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values/${encodeURIComponent(
      `${escapeSheetName(db.repairsSheetTitle)}!A:S`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [rowValues] }),
    }
  );

  if (db.historySheetTitle) {
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values/${encodeURIComponent(
        `${escapeSheetName(db.historySheetTitle)}!A:F`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          values: [
            [
              nowIso,
              ticketId,
              'Nouveau dépôt',
              input.status,
              authorEmail,
              `${input.brand} ${input.model} — ${input.reportedIssue}`.trim(),
            ],
          ],
        }),
      }
    );
  }

  return ticketId;
}

export async function updateRepairTicket(
  token: string,
  db: WorkshopDatabase,
  ticket: RepairTicket,
  updates: RepairFormInput,
  authorEmail: string,
  historyNote?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const range = `${escapeSheetName(db.repairsSheetTitle)}!A${ticket.rowIndex}:S${ticket.rowIndex}`;

  const rowValues = [
    ticket.id,
    ticket.createdAt || nowIso,
    updates.clientName.trim(),
    updates.clientPhone.trim(),
    updates.clientEmail.trim(),
    updates.brand.trim(),
    updates.model.trim(),
    updates.imei.trim(),
    updates.passcode.trim(),
    updates.reportedIssue.trim(),
    updates.technicianDiagnosis.trim(),
    updates.status,
    updates.priority,
    updates.technician.trim(),
    updates.estimatedCost,
    updates.depositPaid,
    updates.dueDate.trim(),
    nowIso,
    updates.notes.trim(),
  ];

  await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [rowValues] }),
    }
  );

  if (
    db.historySheetTitle &&
    (ticket.status !== updates.status || historyNote)
  ) {
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values/${encodeURIComponent(
        `${escapeSheetName(db.historySheetTitle)}!A:F`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          values: [
            [
              nowIso,
              ticket.id,
              ticket.status,
              updates.status,
              authorEmail,
              historyNote ||
                (ticket.status !== updates.status
                  ? `Statut modifié vers « ${updates.status} »`
                  : 'Fiche mise à jour'),
            ],
          ],
        }),
      }
    );
  }
}

export async function deleteRepairTicket(
  token: string,
  db: WorkshopDatabase,
  ticket: RepairTicket,
  authorEmail: string
): Promise<void> {
  await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: db.repairsSheetId,
                dimension: 'ROWS',
                startIndex: ticket.rowIndex - 1,
                endIndex: ticket.rowIndex,
              },
            },
          },
        ],
      }),
    }
  );

  if (db.historySheetTitle) {
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${db.spreadsheetId}/values/${encodeURIComponent(
        `${escapeSheetName(db.historySheetTitle)}!A:F`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          values: [
            [
              new Date().toISOString(),
              ticket.id,
              ticket.status,
              'Supprimé',
              authorEmail,
              `Suppression du dossier ${ticket.clientName} (${ticket.brand} ${ticket.model})`,
            ],
          ],
        }),
      }
    );
  }
}
