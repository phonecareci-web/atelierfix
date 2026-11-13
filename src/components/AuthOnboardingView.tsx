import React, { useState } from 'react';
import {
  Database,
  ExternalLink,
  FileSpreadsheet,
  FolderPlus,
  HardDrive,
  Link2,
  LogOut,
  Moon,
  Smartphone,
  Sun,
  WifiOff,
} from 'lucide-react';
import { DriveSpreadsheetFile } from '../types/repair';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';
import { formatDateTimeFr } from '../lib/statusConfig';

interface AuthOnboardingViewProps {
  needsAuth: boolean;
  isLoggingIn: boolean;
  isOnline: boolean;
  isDark: boolean;
  authError: string | null;
  userEmail?: string | null;
  userName?: string | null;
  driveFiles: DriveSpreadsheetFile[];
  isLoadingFiles: boolean;
  pendingSheetIdFromUrl: string | null;
  offlineTicketsCount: number;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onEnterOfflineMode: () => void;
  onCreateDatabase: () => void;
  onSelectDatabase: (spreadsheetId: string) => void;
  onOpenFromInput: (input: string) => void;
}

export const AuthOnboardingView: React.FC<AuthOnboardingViewProps> = ({
  needsAuth,
  isLoggingIn,
  isOnline,
  isDark,
  authError,
  userEmail,
  userName,
  driveFiles,
  isLoadingFiles,
  pendingSheetIdFromUrl,
  offlineTicketsCount,
  onToggleTheme,
  onSignIn,
  onSignOut,
  onEnterOfflineMode,
  onCreateDatabase,
  onSelectDatabase,
  onOpenFromInput,
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    onOpenFromInput(linkInput);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-slate-100">
            AtelierFix
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
            Gestion d'atelier mobile · Mode hors ligne & Google Sheets
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
              aria-label={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <PWAInstallButton compact />
            {userEmail ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Déconnexion</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onEnterOfflineMode}
                className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 shrink-0 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Ouvrir hors ligne
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="text-xs font-semibold tracking-wide text-blue-700 dark:text-blue-400">
              Atelier de réparation · Application installable hors ligne & cloud
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance] dark:text-slate-100">
              Suivez chaque téléphone réparé, même sans connexion internet
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Enregistrez les dépôts clients localement dans votre navigateur et synchronisez-les vers Google Drive et Google Sheets dès que vous êtes connecté.
            </p>

            {!isOnline && (
              <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <WifiOff className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>
                  Vous êtes actuellement hors ligne. Utilisez le mode local pour travailler sans connexion.
                </span>
              </div>
            )}

            {authError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
              >
                {authError}
              </div>
            )}

            {needsAuth ? (
              <div className="mt-8 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                        Mode hors ligne (base locale sur cet appareil)
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Démarrez immédiatement sans connexion ni compte. Vos dossiers sont conservés dans la base locale IndexedDB et exportables en CSV.
                        {offlineTicketsCount > 0 && (
                          <span className="ml-1 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                            ({offlineTicketsCount} dossier(s) enregistré(s) localement)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onEnterOfflineMode}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <HardDrive className="h-4 w-4" />
                      <span>Travailler hors ligne</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    {pendingSheetIdFromUrl
                      ? 'Connectez-vous pour ouvrir la base Google Sheets partagée'
                      : 'Ou connectez votre compte Google Drive & Sheets'}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {pendingSheetIdFromUrl
                      ? 'Un identifiant de classeur Google Sheets est présent dans le lien. Authentifiez-vous pour charger les dossiers et activer le cache hors ligne.'
                      : 'Synchronisez automatiquement votre atelier dans un classeur Google Sheets stocké sur votre Google Drive.'}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <GoogleSignInButton
                      onClick={onSignIn}
                      disabled={isLoggingIn || !isOnline}
                      label={
                        isLoggingIn
                          ? 'Connexion en cours...'
                          : 'Se connecter avec Google'
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Connecté en tant que
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {userName || userEmail}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onEnterOfflineMode}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <HardDrive className="h-4 w-4" />
                        <span>Base locale</span>
                      </button>
                      <button
                        type="button"
                        onClick={onCreateDatabase}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        <FolderPlus className="h-4 w-4" />
                        <span>Créer sur Google Drive</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bases Google Sheets disponibles sur votre Drive
                    </h3>
                    {isLoadingFiles ? (
                      <div className="mt-3 space-y-2">
                        <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                      </div>
                    ) : driveFiles.length > 0 ? (
                      <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                        {driveFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                                  Modifié le{' '}
                                  {file.modifiedTime
                                    ? formatDateTimeFr(file.modifiedTime)
                                    : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  title="Ouvrir dans Google Sheets"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => onSelectDatabase(file.id)}
                                className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                Ouvrir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400">
                        Aucune base AtelierFix trouvée pour le moment. Créez-en une nouvelle en un clic ou collez le lien d’un Google Sheet existant ci-dessous.
                      </p>
                    )}
                  </div>

                  <form
                    onSubmit={handleLinkSubmit}
                    className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"
                  >
                    <label
                      htmlFor="sheet-url-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Ouvrir un classeur existant par lien ou identifiant
                    </label>
                    <div className="mt-2 flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                          id="sheet-url-input"
                          type="text"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="whitespace-nowrap rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        Charger
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-200 pt-6 text-sm dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  100% Hors ligne
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Application PWA installable avec base IndexedDB locale
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Synchro Sheets
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  File d'attente locale synchronisée dès le retour du réseau
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Accès par lien
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Lanceur Google Drive et partage direct par URL
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-full min-h-[340px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
              {!imgError ? (
                <img
                  src="/src/assets/images/repair_workbench_hero_1794587471493.jpg"
                  alt="Poste de travail d'atelier de réparation de smartphones"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center dark:from-slate-800 dark:to-slate-900">
                  <Smartphone className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                  <p className="mt-3 font-display text-sm font-semibold text-slate-700 dark:text-slate-200">
                    AtelierFix — Poste de réparation
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-6 text-white">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <Database className="h-3.5 w-3.5" />
                  <span>Fonctionne hors ligne et avec Google Sheets</span>
                </div>
                <p className="mt-1.5 text-sm font-medium leading-snug text-white">
                  De l'accueil client à la restitution : travaillez sans interruption même sans connexion internet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
