import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FolderPlus,
  HardDrive,
  Link2,
  X,
} from 'lucide-react';
import { DriveSpreadsheetFile, WorkshopDatabase } from '../types/repair';
import { formatDateTimeFr } from '../lib/statusConfig';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DriveDatabaseModalProps {
  isOpen: boolean;
  db: WorkshopDatabase;
  isOnline: boolean;
  isGoogleAuthenticated: boolean;
  driveFiles: DriveSpreadsheetFile[];
  launcherUrl: string | null;
  onClose: () => void;
  onSignIn: () => void;
  onExportCsv: () => void;
  onSwitchToOfflineLocal: () => void;
  onCreateNewDatabase: () => void;
  onCreateDriveLauncher: () => void;
  onSwitchDatabase: (spreadsheetId: string) => void;
  onOpenFromInput: (input: string) => void;
}

export const DriveDatabaseModal: React.FC<DriveDatabaseModalProps> = ({
  isOpen,
  db,
  isOnline,
  isGoogleAuthenticated,
  driveFiles,
  launcherUrl,
  onClose,
  onSignIn,
  onExportCsv,
  onSwitchToOfflineLocal,
  onCreateNewDatabase,
  onCreateDriveLauncher,
  onSwitchDatabase,
  onOpenFromInput,
}) => {
  const [copiedAppLink, setCopiedAppLink] = useState(false);
  const [inputLink, setInputLink] = useState('');

  if (!isOpen) return null;

  const isLocalOnly = db.spreadsheetId === 'local-offline';
  const shareAppUrl = isLocalOnly
    ? window.location.origin
    : `${window.location.origin}/?sheetId=${encodeURIComponent(
        db.spreadsheetId
      )}`;

  const handleCopyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(shareAppUrl);
      setCopiedAppLink(true);
      setTimeout(() => setCopiedAppLink(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) return;
    onOpenFromInput(inputLink);
    setInputLink('');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="drive-modal-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Stockage hors ligne & Google Drive
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Gérez la base locale IndexedDB, l'export CSV ou votre classeur Google Sheets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          {/* Active Database Info */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Base active
                </p>
                <p className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {db.title}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {isLocalOnly
                    ? 'Stockage persistant IndexedDB sur cet appareil'
                    : `Onglets : ${db.repairsSheetTitle} · ${db.historySheetTitle || '—'}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exporter CSV</span>
                </button>
                {!isLocalOnly && db.webViewLink && (
                  <a
                    href={db.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Google Sheets</span>
                  </a>
                )}
              </div>
            </div>

            {!isLocalOnly && (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lien direct pour ouvrir cet atelier sur n'importe quel poste
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareAppUrl}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleCopyAppLink}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {copiedAppLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* If not connected to Google yet */}
          {!isGoogleAuthenticated ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Connecter Google Drive & Google Sheets
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {isOnline
                  ? 'Connectez votre compte Google pour sauvegarder ou synchroniser vos réparations dans un classeur Google Sheets.'
                  : 'Connexion internet requise pour lier un classeur Google Sheets. En attendant, toutes vos données restent enregistrées localement.'}
              </p>
              <div className="mt-4">
                <GoogleSignInButton
                  onClick={onSignIn}
                  disabled={!isOnline}
                  label="Se connecter avec Google"
                />
              </div>
            </section>
          ) : (
            <>
              {/* Drive Launcher */}
              {!isLocalOnly && (
                <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="max-w-md">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Exécuter l'application depuis Google Drive
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        Enregistre un fichier lanceur HTML dans votre dossier Google Drive « AtelierFix — Dossier Atelier ».
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={onCreateDriveLauncher}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <FileCode2 className="h-4 w-4" />
                      <span>Créer le lanceur dans Drive</span>
                    </button>
                  </div>
                  {launcherUrl && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      <span>Lanceur créé dans votre Google Drive.</span>
                      <a
                        href={launcherUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold underline"
                      >
                        <span>Voir sur Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </section>
              )}

              {/* Switch or Create another DB */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Changer de base de données
                  </h3>
                  <div className="flex items-center gap-2">
                    {!isLocalOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchToOfflineLocal();
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <HardDrive className="h-3.5 w-3.5" />
                        <span>Base locale</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={onCreateNewDatabase}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>Nouvelle base Sheets</span>
                    </button>
                  </div>
                </div>

                {driveFiles.length > 0 && (
                  <div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {driveFiles.map((file) => {
                      const isCurrent = file.id === db.spreadsheetId;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {file.name}
                              </p>
                              <p className="text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                                {file.modifiedTime
                                  ? formatDateTimeFr(file.modifiedTime)
                                  : '—'}
                              </p>
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => {
                                onSwitchDatabase(file.id);
                                onClose();
                              }}
                              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              Basculer
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleOpenSubmit} className="mt-4">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Ouvrir un autre Google Sheet par lien ou ID
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        value={inputLink}
                        onChange={(e) => setInputLink(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!isOnline}
                      className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      Ouvrir
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
