import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  History,
  Kanban,
  LayoutList,
  Link2,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Sun,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  CurrencyCode,
  DriveSpreadsheetFile,
  HistoryEntry,
  PendingConfirmation,
  RepairFormInput,
  RepairStatus,
  RepairTicket,
  SUPPORTED_CURRENCIES,
  WorkshopDatabase,
} from './types/repair';
import {
  clearCachedToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  isFileProtocol,
  logout,
} from './lib/googleAuth';
import {
  appendRepairTicket,
  createDriveLauncherFile,
  createWorkshopDatabase,
  deleteRepairTicket,
  fetchRepairsAndHistory,
  findWorkshopDatabases,
  loadDatabaseMetadata,
  parseSheetIdFromInput,
  updateRepairTicket,
  WorkspaceApiError,
} from './lib/sheetsDb';
import {
  clearSyncQueue,
  createOfflineTicket,
  deleteOfflineTicket,
  exportTicketsToCsv,
  getOfflineHistory,
  getOfflineTickets,
  getSavedCurrencyPreference,
  getSavedDbMeta,
  getSavedThemePreference,
  getSyncQueue,
  LOCAL_WORKSHOP_DB,
  OfflineSyncOperation,
  saveActiveDbMeta,
  saveCurrencyPreference,
  saveOfflineHistorySnapshot,
  saveOfflineTicketsSnapshot,
  saveThemePreference,
  updateOfflineTicket,
} from './lib/offlineDb';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { formatCurrency, formatDateTimeFr } from './lib/statusConfig';
import { AuthOnboardingView } from './components/AuthOnboardingView';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { DriveDatabaseModal } from './components/DriveDatabaseModal';
import { KanbanBoard } from './components/KanbanBoard';
import { MonthlyRevenueChart } from './components/MonthlyRevenueChart';
import { PrintableReceiptModal } from './components/PrintableReceiptModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RepairFormModal } from './components/RepairFormModal';
import { RepairsTable } from './components/RepairsTable';
import { TicketDetailDrawer } from './components/TicketDetailDrawer';

type NavSection = 'repairs' | 'history';
type ViewMode = 'table' | 'pipeline';
type StatusFilter = 'all' | 'active' | 'waiting' | 'ready' | 'delivered';

function getInitialUrlParams(): {
  sheetId: string | null;
  ticketId: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  let sheetId = params.get('sheetId');
  const ticketId = params.get('ticket');

  if (!sheetId) {
    const stateParam = params.get('state');
    if (stateParam) {
      try {
        const parsed = JSON.parse(stateParam);
        if (Array.isArray(parsed?.ids) && parsed.ids[0]) {
          sheetId = String(parsed.ids[0]);
        }
      } catch {
        // ignore invalid state param
      }
    }
  }

  return { sheetId, ticketId };
}

export default function App() {
  const initialParams = useMemo(() => getInitialUrlParams(), []);
  const isOnline = useOnlineStatus();

  // Auth state
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Database & Drive files state
  const [db, setDb] = useState<WorkshopDatabase | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [targetSheetId, setTargetSheetId] = useState<string | null>(
    initialParams.sheetId
  );
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(
    initialParams.ticketId
  );
  const [launcherUrl, setLauncherUrl] = useState<string | null>(null);

  // Offline / Local cache & queue state
  const [offlineBootstrapped, setOfflineBootstrapped] = useState(false);
  const [cachedOfflineCount, setCachedOfflineCount] = useState(0);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncOperation[]>([]);

  // Data state
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  // UI state
  const [activeNav, setActiveNav] = useState<NavSection>('repairs');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  // Modals / Drawers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<RepairTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [receiptTicket, setReceiptTicket] = useState<RepairTicket | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const isLocalOnlyDb = db?.spreadsheetId === 'local-offline';
  const hasCloudSession =
    !!db && !isLocalOnlyDb && isOnline && !needsAuth && !!getAccessToken();

  const refreshLocalState = useCallback(async () => {
    const [localTickets, localHistory, queue] = await Promise.all([
      getOfflineTickets(),
      getOfflineHistory(),
      getSyncQueue(),
    ]);
    setTickets(localTickets);
    setHistory(localHistory);
    setSyncQueue(queue);
    setCachedOfflineCount(localTickets.length);
  }, []);

  // Bootstrap offline IndexedDB state on initial mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [
          savedDb,
          localTickets,
          localHistory,
          queue,
          savedCurrency,
          savedTheme,
        ] = await Promise.all([
          getSavedDbMeta(),
          getOfflineTickets(),
          getOfflineHistory(),
          getSyncQueue(),
          getSavedCurrencyPreference(),
          getSavedThemePreference(),
        ]);
        if (!active) return;

        setCurrency(savedCurrency);
        if (savedTheme) {
          const dark = savedTheme === 'dark';
          setIsDark(dark);
          document.documentElement.classList.toggle('dark', dark);
        }
        setCachedOfflineCount(localTickets.length);
        setSyncQueue(queue);

        if (
          isFileProtocol ||
          (!navigator.onLine && (savedDb || localTickets.length > 0)) ||
          (savedDb?.spreadsheetId === 'local-offline' && !initialParams.sheetId)
        ) {
          setDb(
            isFileProtocol
              ? savedDb?.spreadsheetId === 'local-offline'
                ? savedDb
                : LOCAL_WORKSHOP_DB
              : savedDb || LOCAL_WORKSHOP_DB
          );
          setTickets(localTickets);
          setHistory(localHistory);
        }
      } catch {
        // IndexedDB unavailable fallback
      } finally {
        if (active) setOfflineBootstrapped(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialParams.sheetId]);

  const handleToggleTheme = useCallback(async () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    const themeValue = nextDark ? 'dark' : 'light';
    try {
      localStorage.setItem('atelierfix_theme', themeValue);
    } catch {
      // ignore storage errors
    }
    try {
      await saveThemePreference(themeValue);
    } catch {
      // ignore IndexedDB error
    }
  }, [isDark]);

  const handleCurrencyChange = useCallback(async (nextCurrency: CurrencyCode) => {
    setCurrency(nextCurrency);
    try {
      await saveCurrencyPreference(nextCurrency);
    } catch {
      // ignore IndexedDB error
    }
  }, []);

  const handleApiError = useCallback((err: unknown, fallbackMessage: string) => {
    if (err instanceof WorkspaceApiError && err.isAuthError) {
      clearCachedToken();
      setNeedsAuth(true);
      setAuthError(
        'Votre session Google a expiré. Vos données restent accessibles hors ligne ; reconnectez-vous pour synchroniser.'
      );
      return;
    }
    const msg = err instanceof Error ? err.message : fallbackMessage;
    setAppError(msg || fallbackMessage);
  }, []);

  const syncTickets = useCallback(
    async (activeDb: WorkshopDatabase, silent = false) => {
      if (activeDb.spreadsheetId === 'local-offline') {
        await refreshLocalState();
        return;
      }

      if (!navigator.onLine) {
        await refreshLocalState();
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }

      if (!silent) setIsSyncing(true);
      try {
        const result = await fetchRepairsAndHistory(token, activeDb);
        // Only overwrite local cache with remote snapshot if there are no pending offline edits
        const pendingQueue = await getSyncQueue();
        if (pendingQueue.length === 0) {
          setTickets(result.tickets);
          setHistory(result.history);
          await Promise.all([
            saveOfflineTicketsSnapshot(result.tickets),
            saveOfflineHistorySnapshot(result.history),
          ]);
        } else {
          setSyncQueue(pendingQueue);
        }
        setLastSyncedAt(new Date().toISOString());
        setAppError(null);
      } catch (err) {
        handleApiError(err, 'Erreur lors de la synchronisation Google Sheets.');
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [handleApiError, refreshLocalState]
  );

  const openSpreadsheetById = useCallback(
    async (spreadsheetId: string) => {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      setIsSyncing(true);
      setAppError(null);
      try {
        const loadedDb = await loadDatabaseMetadata(token, spreadsheetId);
        setDb(loadedDb);
        setTargetSheetId(loadedDb.spreadsheetId);
        await saveActiveDbMeta(loadedDb);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('sheetId', loadedDb.spreadsheetId);
        window.history.replaceState({}, '', nextUrl.toString());

        await syncTickets(loadedDb);
      } catch (err) {
        handleApiError(
          err,
          "Impossible d'ouvrir ce classeur Google Sheets. Vérifiez les droits d'accès."
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [handleApiError, syncTickets]
  );

  const loadDriveFilesList = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !navigator.onLine) return [];
    setIsLoadingFiles(true);
    try {
      const files = await findWorkshopDatabases(token);
      setDriveFiles(files);
      return files;
    } catch (err) {
      handleApiError(err, 'Impossible de lister vos fichiers Google Drive.');
      return [];
    } finally {
      setIsLoadingFiles(false);
    }
  }, [handleApiError]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsub = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      (maybeUser) => {
        setUser(maybeUser);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  // Auto-open ticket from ?ticket= URL parameter once loaded
  useEffect(() => {
    if (pendingTicketId && tickets.length > 0) {
      const match = tickets.find(
        (t) => t.id.toLowerCase() === pendingTicketId.toLowerCase()
      );
      if (match) {
        setSelectedTicketId(match.id);
      }
      setPendingTicketId(null);
    }
  }, [pendingTicketId, tickets]);

  // Real-time polling every 15s when online + connected to Google Sheets + no pending offline queue
  useEffect(() => {
    if (!hasCloudSession || !autoSync || syncQueue.length > 0 || !db) return;
    const intervalId = window.setInterval(() => {
      syncTickets(db, true);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [hasCloudSession, autoSync, syncQueue.length, db, syncTickets]);

  const handleEnterOfflineMode = async () => {
    await saveActiveDbMeta(LOCAL_WORKSHOP_DB);
    setDb(LOCAL_WORKSHOP_DB);
    await refreshLocalState();
    setAppError(null);
    setAuthError(null);
  };

  const handleSignIn = async () => {
    if (!isOnline) {
      setAuthError(
        'Connexion internet requise pour vous connecter à Google Drive.'
      );
      return;
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);

      const files = await loadDriveFilesList();
      if (targetSheetId && targetSheetId !== 'local-offline') {
        await openSpreadsheetById(targetSheetId);
      } else if (db && db.spreadsheetId !== 'local-offline') {
        await syncTickets(db);
      } else if (files && files.length === 1) {
        await openSpreadsheetById(files[0].id);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Échec de la connexion avec Google.';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setDriveFiles([]);
    setNeedsAuth(true);
    if (db && db.spreadsheetId !== 'local-offline') {
      setDb(null);
    }
  };

  const handleRequestCreateDatabase = () => {
    setPendingConfirmation({
      title: 'Créer la base atelier sur Google Drive ?',
      description:
        'Un nouveau classeur Google Sheets structuré (« AtelierFix — Base Réparations ») sera créé dans un dossier « AtelierFix — Dossier Atelier » sur votre Google Drive.',
      details: [
        'Onglet 1 : Réparations (fiches clients, téléphones, statuts, coûts)',
        'Onglet 2 : Historique (journal chronologique des étapes)',
      ],
      confirmLabel: 'Créer sur Google Drive',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        const created = await createWorkshopDatabase(token);
        setDb(created);
        setTargetSheetId(created.spreadsheetId);
        await saveActiveDbMeta(created);
        await clearSyncQueue();

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('sheetId', created.spreadsheetId);
        window.history.replaceState({}, '', nextUrl.toString());

        await loadDriveFilesList();
        await syncTickets(created);
      },
    });
  };

  const handleRequestCreateDriveLauncher = () => {
    if (!db || isLocalOnlyDb) return;
    setPendingConfirmation({
      title: 'Créer le lanceur HTML dans Google Drive ?',
      description:
        "Un fichier « Ouvrir AtelierFix (Application Atelier).html » sera enregistré dans votre dossier Google Drive pour ouvrir directement cet atelier par un lien.",
      details: [
        `Base liée : ${db.title}`,
        `Lien cible : ${window.location.origin}/?sheetId=${db.spreadsheetId}`,
      ],
      confirmLabel: 'Enregistrer dans Drive',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        const res = await createDriveLauncherFile(
          token,
          db.spreadsheetId,
          window.location.origin
        );
        setLauncherUrl(res.webViewLink);
      },
    });
  };

  const handleOpenFromInput = (rawInput: string) => {
    const parsedId = parseSheetIdFromInput(rawInput);
    if (!parsedId) {
      const msg =
        "Lien ou identifiant Google Sheets invalide. Copiez l'URL complète du classeur.";
      setAppError(msg);
      setAuthError(msg);
      return;
    }
    openSpreadsheetById(parsedId);
  };

  const handleFormSubmit = async (
    formData: RepairFormInput,
    editing: RepairTicket | null
  ) => {
    if (!db) return;
    const authorEmail =
      user?.email || user?.displayName || 'Technicien (Hors ligne)';

    // Offline or local-only mode: write directly to IndexedDB immediately
    if (!hasCloudSession) {
      if (editing) {
        await updateOfflineTicket(
          editing,
          formData,
          authorEmail,
          !isLocalOnlyDb
        );
      } else {
        const { ticket } = await createOfflineTicket(
          formData,
          authorEmail,
          !isLocalOnlyDb
        );
        setSelectedTicketId(ticket.id);
      }
      setIsFormOpen(false);
      setEditingTicket(null);
      await refreshLocalState();
      return;
    }

    // Online Google Sheets mode: require explicit confirmation modal
    if (editing) {
      setPendingConfirmation({
        title: `Mettre à jour le ticket ${editing.id} ?`,
        description:
          'Les modifications seront écrites directement dans votre feuille Google Sheets.',
        details: [
          `Client : ${formData.clientName} (${formData.clientPhone})`,
          `Appareil : ${formData.brand} ${formData.model}`,
          `Statut : ${editing.status} → ${formData.status}`,
          `Devis : ${formatCurrency(formData.estimatedCost, currency)}`,
        ],
        confirmLabel: 'Confirmer la mise à jour',
        onConfirm: async () => {
          const token = getAccessToken();
          if (!token) {
            setNeedsAuth(true);
            return;
          }
          await updateRepairTicket(token, db, editing, formData, authorEmail);
          setIsFormOpen(false);
          setEditingTicket(null);
          await syncTickets(db);
        },
      });
    } else {
      setPendingConfirmation({
        title: 'Enregistrer ce nouveau dépôt dans Google Sheets ?',
        description:
          'Une nouvelle ligne de réparation et une entrée dans le journal historique vont être ajoutées.',
        details: [
          `Client : ${formData.clientName} (${formData.clientPhone})`,
          `Appareil : ${formData.brand} ${formData.model}`,
          `Panne : ${formData.reportedIssue}`,
          `Devis estimé : ${formatCurrency(formData.estimatedCost, currency)}`,
        ],
        confirmLabel: 'Enregistrer dans Sheets',
        onConfirm: async () => {
          const token = getAccessToken();
          if (!token) {
            setNeedsAuth(true);
            return;
          }
          const createdId = await appendRepairTicket(
            token,
            db,
            formData,
            authorEmail,
            tickets
          );
          setIsFormOpen(false);
          await syncTickets(db);
          setSelectedTicketId(createdId);
        },
      });
    }
  };

  const handleQuickStatusChange = async (
    ticket: RepairTicket,
    nextStatus: RepairStatus
  ) => {
    if (!db || ticket.status === nextStatus) return;
    const authorEmail =
      user?.email || user?.displayName || 'Technicien (Hors ligne)';

    const updatedInput: RepairFormInput = {
      clientName: ticket.clientName,
      clientPhone: ticket.clientPhone,
      clientEmail: ticket.clientEmail,
      brand: ticket.brand,
      model: ticket.model,
      imei: ticket.imei,
      passcode: ticket.passcode,
      reportedIssue: ticket.reportedIssue,
      technicianDiagnosis: ticket.technicianDiagnosis,
      status: nextStatus,
      priority: ticket.priority,
      technician: ticket.technician,
      estimatedCost: ticket.estimatedCost,
      depositPaid: ticket.depositPaid,
      dueDate: ticket.dueDate,
      notes: ticket.notes,
    };

    if (!hasCloudSession) {
      await updateOfflineTicket(
        ticket,
        updatedInput,
        authorEmail,
        !isLocalOnlyDb,
        `Transition rapide : ${ticket.status} → ${nextStatus}`
      );
      await refreshLocalState();
      return;
    }

    setPendingConfirmation({
      title: `Passer ${ticket.id} à « ${nextStatus} » ?`,
      description: `Le statut de l'appareil (${ticket.brand} ${ticket.model} de ${ticket.clientName}) sera mis à jour dans Google Sheets et journalisé.`,
      details: [`Changement : ${ticket.status} → ${nextStatus}`],
      confirmLabel: 'Mettre à jour le statut',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await updateRepairTicket(
          token,
          db,
          ticket,
          updatedInput,
          authorEmail,
          `Transition rapide : ${ticket.status} → ${nextStatus}`
        );
        await syncTickets(db);
      },
    });
  };

  const handleDeleteTicket = (ticket: RepairTicket) => {
    if (!db) return;
    const authorEmail =
      user?.email || user?.displayName || 'Technicien (Hors ligne)';

    setPendingConfirmation({
      title: `Supprimer définitivement le dossier ${ticket.id} ?`,
      description: hasCloudSession
        ? 'Cette action supprimera la ligne correspondante dans votre classeur Google Sheets. Cette opération est irréversible.'
        : 'Cette action supprimera le dossier de votre base locale hors ligne. Cette opération est irréversible.',
      details: [
        `Client : ${ticket.clientName} (${ticket.clientPhone})`,
        `Appareil : ${ticket.brand} ${ticket.model}`,
      ],
      confirmLabel: hasCloudSession
        ? 'Supprimer de Google Sheets'
        : 'Supprimer localement',
      variant: 'danger',
      onConfirm: async () => {
        if (!hasCloudSession) {
          await deleteOfflineTicket(ticket, authorEmail, !isLocalOnlyDb);
          setSelectedTicketId(null);
          await refreshLocalState();
          return;
        }

        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await deleteRepairTicket(token, db, ticket, authorEmail);
        setSelectedTicketId(null);
        await syncTickets(db);
      },
    });
  };

  const handlePushOfflineQueueToSheets = () => {
    if (!db || isLocalOnlyDb || syncQueue.length === 0) return;

    setPendingConfirmation({
      title: `Synchroniser ${syncQueue.length} modification(s) vers Google Sheets ?`,
      description:
        'Les opérations enregistrées hors ligne vont être appliquées dans votre classeur Google Sheets.',
      details: syncQueue.slice(0, 6).map((op) => {
        const label =
          op.type === 'create'
            ? 'Création'
            : op.type === 'update'
            ? 'Mise à jour'
            : 'Suppression';
        return `${label} · ${op.ticketId} (${formatDateTimeFr(op.timestamp)})`;
      }),
      confirmLabel: 'Synchroniser maintenant',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        setIsSyncing(true);
        try {
          const remote = await fetchRepairsAndHistory(token, db);
          let currentRemoteTickets = [...remote.tickets];

          for (const op of syncQueue) {
            if (op.type === 'create' && op.input) {
              await appendRepairTicket(
                token,
                db,
                op.input,
                op.author,
                currentRemoteTickets
              );
              const refreshed = await fetchRepairsAndHistory(token, db);
              currentRemoteTickets = refreshed.tickets;
            } else if (op.type === 'update' && op.input) {
              const target = currentRemoteTickets.find(
                (t) => t.id === op.ticketId
              );
              if (target) {
                await updateRepairTicket(
                  token,
                  db,
                  target,
                  op.input,
                  op.author,
                  op.note
                );
              }
            } else if (op.type === 'delete') {
              const target = currentRemoteTickets.find(
                (t) => t.id === op.ticketId
              );
              if (target) {
                await deleteRepairTicket(token, db, target, op.author);
                const refreshed = await fetchRepairsAndHistory(token, db);
                currentRemoteTickets = refreshed.tickets;
              }
            }
          }

          await clearSyncQueue();
          setSyncQueue([]);
          await syncTickets(db);
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleCopyShareLink = async () => {
    if (!db || isLocalOnlyDb) return;
    const url = `${window.location.origin}/?sheetId=${encodeURIComponent(
      db.spreadsheetId
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter === 'active') {
        if (
          t.status !== 'Reçu' &&
          t.status !== 'En diagnostic' &&
          t.status !== 'En réparation'
        ) {
          return false;
        }
      } else if (statusFilter === 'waiting') {
        if (t.status !== 'En attente pièce') return false;
      } else if (statusFilter === 'ready') {
        if (t.status !== 'Prêt') return false;
      } else if (statusFilter === 'delivered') {
        if (t.status !== 'Livré' && t.status !== 'Annulé') return false;
      }

      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.clientPhone.toLowerCase().includes(q) ||
        t.brand.toLowerCase().includes(q) ||
        t.model.toLowerCase().includes(q) ||
        t.imei.toLowerCase().includes(q) ||
        t.reportedIssue.toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, searchQuery]);

  const kpis = useMemo(() => {
    const inWorkshop = tickets.filter(
      (t) =>
        t.status === 'Reçu' ||
        t.status === 'En diagnostic' ||
        t.status === 'En réparation'
    ).length;
    const waitingParts = tickets.filter(
      (t) => t.status === 'En attente pièce'
    ).length;
    const readyPickup = tickets.filter((t) => t.status === 'Prêt').length;
    const activeRevenue = tickets
      .filter((t) => t.status !== 'Annulé')
      .reduce((sum, t) => sum + (t.estimatedCost || 0), 0);

    return { inWorkshop, waitingParts, readyPickup, activeRevenue };
  }, [tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  // Wait briefly for IndexedDB check before rendering onboarding vs offline workshop
  if (!offlineBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Chargement d'AtelierFix...
      </div>
    );
  }

  // Show onboarding screen only if no active DB (neither Google Sheets nor local offline)
  if (!db) {
    return (
      <>
        <AuthOnboardingView
          needsAuth={needsAuth}
          isLoggingIn={isLoggingIn}
          isOnline={isOnline}
          isDark={isDark}
          authError={authError}
          userEmail={user?.email}
          userName={user?.displayName}
          driveFiles={driveFiles}
          isLoadingFiles={isLoadingFiles}
          pendingSheetIdFromUrl={targetSheetId}
          offlineTicketsCount={cachedOfflineCount}
          onToggleTheme={handleToggleTheme}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onEnterOfflineMode={handleEnterOfflineMode}
          onCreateDatabase={handleRequestCreateDatabase}
          onSelectDatabase={openSpreadsheetById}
          onOpenFromInput={handleOpenFromInput}
        />
        <ConfirmActionModal
          pending={pendingConfirmation}
          onCancel={() => setPendingConfirmation(null)}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar (250px) */}
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-100">
            AtelierFix
          </span>
          <button
            type="button"
            onClick={handleToggleTheme}
            title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
            aria-label={
              isDark ? 'Passer au mode clair' : 'Passer au mode sombre'
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <button
            type="button"
            onClick={() => setActiveNav('repairs')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeNav === 'repairs'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Suivi réparations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('history')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeNav === 'history'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>Journal d'activité</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isOnline && !needsAuth) loadDriveFilesList();
              setIsDriveModalOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Database className="h-4 w-4 shrink-0" />
            <span>Stockage & Drive</span>
          </button>
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <div>
            <label
              htmlFor="sidebar-currency-select"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Devise de l'atelier
            </label>
            <select
              id="sidebar-currency-select"
              value={currency}
              onChange={(e) =>
                handleCurrencyChange(e.target.value as CurrencyCode)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>

          <PWAInstallButton
            spreadsheetId={db.spreadsheetId}
            workshopTitle={db.title}
          />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              {isLocalOnlyDb ? (
                <HardDrive className="h-3.5 w-3.5 shrink-0 text-slate-700 dark:text-slate-300" />
              ) : isOnline ? (
                <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
              )}
              <span className="truncate">{db.title}</span>
            </div>
            {!isLocalOnlyDb && db.webViewLink ? (
              <a
                href={db.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                <span>Ouvrir Google Sheets</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(true)}
                className="mt-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                Configurer Google Drive
              </button>
            )}
          </div>

          {user ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user.displayName || 'Technicien'}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Se déconnecter"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDb(null)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Écran d'accueil / Connexion
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/75"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white shadow-xl dark:border-r dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
              <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                AtelierFix
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('repairs');
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Smartphone className="h-4 w-4" />
                <span>Suivi réparations</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('history');
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <History className="h-4 w-4" />
                <span>Journal d'activité</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isOnline && !needsAuth) loadDriveFilesList();
                  setIsDriveModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Database className="h-4 w-4" />
                <span>Stockage & Drive</span>
              </button>
            </nav>
            <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
              <div>
                <label
                  htmlFor="mobile-currency-select"
                  className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
                >
                  Devise de l'atelier
                </label>
                <select
                  id="mobile-currency-select"
                  value={currency}
                  onChange={(e) =>
                    handleCurrencyChange(e.target.value as CurrencyCode)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <PWAInstallButton
                spreadsheetId={db.spreadsheetId}
                workshopTitle={db.title}
              />
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDb(null);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Écran d'accueil
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav
              aria-label="Fil d'Ariane"
              className="flex min-w-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
            >
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                Atelier
              </span>
              <span aria-hidden="true">/</span>
              <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {activeNav === 'repairs'
                  ? 'Tableau des réparations'
                  : "Journal d'activité"}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingTicket(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 shrink-0 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Enregistrer un téléphone</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8">
          {/* Connectivity / Sync Outbox Banner */}
          {!isOnline && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <WifiOff className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>
                  Mode hors ligne actif — Toutes vos créations et mises à jour sont enregistrées localement dans cet appareil.
                </span>
              </div>
              {syncQueue.length > 0 && (
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {syncQueue.length} modification(s) en attente de réseau
                </span>
              )}
            </div>
          )}

          {isOnline && !isLocalOnlyDb && syncQueue.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
              <div className="flex items-center gap-2.5">
                <CloudUpload className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                <span>
                  <strong className="tabular-nums">{syncQueue.length}</strong>{' '}
                  modification(s) effectuée(s) hors ligne prête(s) à être envoyée(s) vers Google Sheets.
                </span>
              </div>
              {needsAuth ? (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="whitespace-nowrap rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Reconnecter Google pour synchroniser
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePushOfflineQueueToSheets}
                  className="whitespace-nowrap rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Synchroniser vers Google Sheets
                </button>
              )}
            </div>
          )}

          {appError && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
            >
              <span>{appError}</span>
              <button
                type="button"
                onClick={() => setAppError(null)}
                className="text-xs font-semibold underline"
              >
                Fermer
              </button>
            </div>
          )}

          {/* KPI Strip + Monthly Revenue Chart */}
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-2 gap-4 lg:col-span-6">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  En cours d'atelier
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {kpis.inWorkshop}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reçus, diagnostic et réparation
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  En attente de pièce
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-400">
                  {kpis.waitingParts}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Commandes fournisseurs
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Prêts pour retrait
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                  {kpis.readyPickup}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Appareils testés à restituer
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Volume devis actifs
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatCurrency(kpis.activeRevenue, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Sur {tickets.length} dossier(s) enregistrés
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <MonthlyRevenueChart
                tickets={tickets}
                currency={currency}
                isDark={isDark}
              />
            </div>
          </section>

          {activeNav === 'repairs' ? (
            <>
              {/* Workspace Toolbar */}
              <section className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative min-w-[240px] flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher par client, téléphone, modèle, IMEI ou ticket..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          viewMode === 'table'
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                        }`}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        <span>Liste</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('pipeline')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          viewMode === 'pipeline'
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                        }`}
                      >
                        <Kanban className="h-3.5 w-3.5" />
                        <span>Pipeline temps réel</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => exportTicketsToCsv(tickets, currency)}
                      disabled={tickets.length === 0}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export CSV</span>
                    </button>

                    {!isLocalOnlyDb && (
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {copiedShareLink ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Lien copié
                            </span>
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Partager le lien</span>
                          </>
                        )}
                      </button>
                    )}

                    {hasCloudSession && (
                      <button
                        type="button"
                        onClick={() => syncTickets(db)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            isSyncing ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Actualiser</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Filter Bar & Sync Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    {(
                      [
                        { id: 'all', label: 'Tous' },
                        { id: 'active', label: 'En cours' },
                        { id: 'waiting', label: 'Attente pièce' },
                        { id: 'ready', label: 'Prêts' },
                        { id: 'delivered', label: 'Livrés / Clôturés' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          statusFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {hasCloudSession ? (
                      <>
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => setAutoSync(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-700 dark:border-slate-600 dark:bg-slate-800"
                          />
                          <span>Synchro auto (15s)</span>
                        </label>
                        {lastSyncedAt && (
                          <span>
                            Dernière synchro : {formatDateTimeFr(lastSyncedAt)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>
                        Stockage local hors ligne · {tickets.length} fiche(s)
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Main Data View */}
              <section className="mt-5">
                {viewMode === 'table' ? (
                  <RepairsTable
                    tickets={filteredTickets}
                    currency={currency}
                    isLoading={isSyncing}
                    hasActiveFilters={
                      statusFilter !== 'all' || searchQuery.trim().length > 0
                    }
                    onSelectTicket={(t) => setSelectedTicketId(t.id)}
                    onNewTicket={() => {
                      setEditingTicket(null);
                      setIsFormOpen(true);
                    }}
                    onResetFilters={() => {
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                  />
                ) : (
                  <KanbanBoard
                    tickets={filteredTickets}
                    currency={currency}
                    onSelectTicket={(t) => setSelectedTicketId(t.id)}
                    onAdvanceStatus={handleQuickStatusChange}
                    onNewTicket={() => {
                      setEditingTicket(null);
                      setIsFormOpen(true);
                    }}
                  />
                )}
              </section>
            </>
          ) : (
            /* Activity History View */
            <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    Journal des mouvements
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {isLocalOnlyDb
                      ? 'Historique local enregistré dans IndexedDB'
                      : `Historique extrait de l'onglet « ${db.historySheetTitle || 'Historique'} »`}
                  </p>
                </div>
                {hasCloudSession && (
                  <button
                    type="button"
                    onClick={() => syncTickets(db)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Actualiser</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucun mouvement enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                        <th className="px-4 py-3">Date & heure</th>
                        <th className="px-4 py-3">Ticket</th>
                        <th className="px-4 py-3">Transition</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3">Auteur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {history.map((h, i) => (
                        <tr
                          key={`${h.timestamp}-${i}`}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                            {formatDateTimeFr(h.timestamp)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                            {h.ticketId}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                            {h.previousStatus} → {h.newStatus}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                            {h.note || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                            {h.author}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <RepairFormModal
        isOpen={isFormOpen}
        editingTicket={editingTicket}
        currency={currency}
        defaultTechnician={user?.displayName || ''}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTicket(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <TicketDetailDrawer
        ticket={selectedTicket}
        history={history}
        spreadsheetId={db.spreadsheetId}
        currency={currency}
        onClose={() => setSelectedTicketId(null)}
        onEdit={(t) => {
          setEditingTicket(t);
          setIsFormOpen(true);
        }}
        onQuickStatusChange={handleQuickStatusChange}
        onDelete={handleDeleteTicket}
        onOpenReceipt={(t) => setReceiptTicket(t)}
      />

      <PrintableReceiptModal
        ticket={receiptTicket}
        spreadsheetId={db.spreadsheetId}
        workshopTitle={db.title}
        currency={currency}
        onClose={() => setReceiptTicket(null)}
      />

      <DriveDatabaseModal
        isOpen={isDriveModalOpen}
        db={db}
        isOnline={isOnline}
        isGoogleAuthenticated={!needsAuth && !!user}
        driveFiles={driveFiles}
        launcherUrl={launcherUrl}
        onClose={() => setIsDriveModalOpen(false)}
        onSignIn={handleSignIn}
        onExportCsv={() => exportTicketsToCsv(tickets, currency)}
        onSwitchToOfflineLocal={handleEnterOfflineMode}
        onCreateNewDatabase={handleRequestCreateDatabase}
        onCreateDriveLauncher={handleRequestCreateDriveLauncher}
        onSwitchDatabase={openSpreadsheetById}
        onOpenFromInput={handleOpenFromInput}
      />

      <ConfirmActionModal
        pending={pendingConfirmation}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
}
