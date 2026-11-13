import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  FileCode2,
  HardDriveDownload,
  Laptop,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isFileProtocol } from '../lib/googleAuth';
import { buildLauncherHtml, downloadTextFile } from '../lib/launcherGenerator';

interface PWAInstallButtonProps {
  compact?: boolean;
  spreadsheetId?: string | null;
  workshopTitle?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  spreadsheetId,
  workshopTitle,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Already running as installed standalone PWA or opened from local standalone file
  if (isInstalled || isFileProtocol) {
    return null;
  }

  const isInIframe =
    typeof window !== 'undefined' && window.self !== window.top;
  const originUrl =
    typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin
      : '';
  const directLaunchUrl =
    originUrl && spreadsheetId && spreadsheetId !== 'local-offline'
      ? `${originUrl}/?sheetId=${encodeURIComponent(spreadsheetId)}`
      : originUrl || '/';

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowModal(true);
  };

  const handleDownloadLauncher = () => {
    if (!originUrl) return;
    const html = buildLauncherHtml({
      appUrl: originUrl,
      spreadsheetId,
      workshopTitle,
    });
    downloadTextFile('AtelierFix-Lanceur.html', html);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
        <span>
          {compact ? 'Installer' : "Installer / Fichier prêt à l'emploi"}
        </span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] dark:bg-slate-950/75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3
                  id="install-modal-title"
                  className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Installer AtelierFix prêt à l'emploi
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Choisissez l'installation directe (PWA) ou téléchargez le fichier autonome hors ligne
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* 1. Standalone Single-File Offline HTML */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/70 dark:bg-blue-950/35">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white dark:bg-blue-600">
                    <HardDriveDownload className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Fichier autonome hors ligne (1 seul fichier HTML)
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      Téléchargez <strong>AtelierFix-Autonome.html</strong> : double-cliquez dessus sur Windows, Mac, Linux ou Android pour lancer l'atelier complet sans serveur ni connexion internet (base locale IndexedDB incluse).
                    </p>
                    <div className="mt-3">
                      <a
                        href="/AtelierFix-Autonome.html"
                        download="AtelierFix-Autonome.html"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Télécharger AtelierFix-Autonome.html</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Web / Drive Launcher File */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <FileCode2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Fichier lanceur connecté (Bureau ou Google Drive)
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      Raccourci léger qui ouvre directement votre atelier avec synchronisation Google Drive et Google Sheets.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadLauncher}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Télécharger AtelierFix-Lanceur.html</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Native PWA Installation */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Installation directe comme application (PWA)
                    </h4>
                    {isIOS ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        Dans Safari : touchez <strong>Partager</strong> puis choisissez <strong>Sur l'écran d'accueil</strong> pour installer AtelierFix hors ligne.
                      </p>
                    ) : isInIframe ? (
                      <>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          Ouvrez l'application dans un onglet dédié pour activer le bouton d'installation natif de Chrome, Edge ou Android.
                        </p>
                        <div className="mt-3">
                          <a
                            href={directLaunchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Ouvrir en mode installable</span>
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur (Chrome / Edge : <strong>Installer AtelierFix</strong>) pour ajouter un raccourci natif sur votre poste.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
