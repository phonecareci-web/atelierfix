import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
        <span>Installer l'application</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${
            compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2 text-xs'
          }`}
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
          <span>Installer sur iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Installer AtelierFix sur iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                1. Touchez le bouton <strong>Partager</strong> dans la barre de Safari.
                <br />
                2. Faites défiler et choisissez{' '}
                <strong>Sur l'écran d'accueil</strong> pour utiliser
                l'application même hors ligne.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
