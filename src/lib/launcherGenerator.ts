export function buildLauncherHtml(options: {
  appUrl: string;
  spreadsheetId?: string | null;
  workshopTitle?: string;
}): string {
  const { appUrl, spreadsheetId, workshopTitle } = options;
  const isSheet =
    spreadsheetId && spreadsheetId !== 'local-offline' && spreadsheetId.trim();
  const directLink = isSheet
    ? `${appUrl.replace(/\/$/, '')}/?sheetId=${encodeURIComponent(spreadsheetId!)}`
    : appUrl;
  const titleLabel = workshopTitle?.trim() || 'AtelierFix — Atelier Réparation';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0; url=${directLink}" />
  <title>${titleLabel}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #020617; color: #f1f5f9; }
      .card { background: #0f172a !important; border-color: #1e293b !important; }
      .muted { color: #94a3b8 !important; }
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 32px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
    }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .muted { font-size: 14px; color: #475569; margin: 0 0 20px; line-height: 1.5; }
    a.btn {
      display: inline-block;
      background: #1d4ed8;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 22px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
    }
    a.btn:hover { background: #1e40af; }
    .hint { margin-top: 18px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${titleLabel}</h1>
    <p class="muted">Ouverture automatique de votre logiciel de gestion d'atelier de réparation...</p>
    <a class="btn" href="${directLink}">Ouvrir AtelierFix</a>
    <p class="hint">Astuce : une fois ouvert dans Chrome, Edge ou Safari, cliquez sur « Installer l'application » pour créer un raccourci natif hors ligne.</p>
  </div>
  <script>
    if (window.location.protocol !== 'file:' || navigator.onLine) {
      window.location.replace(${JSON.stringify(directLink)});
    }
  </script>
</body>
</html>`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/html;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
