/** Échappe le HTML : les données de la base ne doivent jamais être injectées telles quelles. */
export const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Neutralise l'injection de formules Excel (=, +, -, @ en début de cellule). */
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(';'));
  // BOM UTF-8 + séparateur « ; » : s'ouvre correctement dans Excel en français.
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Ouvre une fenêtre d'impression (le navigateur permet « Enregistrer en PDF »). */
export function printTable(title, subtitle, headers, rows) {
  const w = window.open('', '_blank');
  if (!w) return false;
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;color:#162033;margin:32px}
  h1{font-size:20px;margin:0;color:#0f2457} p{margin:4px 0 20px;color:#556277;font-size:13px}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th{background:#1a3a89;color:#fff;text-align:left;padding:8px} td{padding:7px 8px;border-bottom:1px solid #d5e0ec}
  tr:nth-child(even) td{background:#f2f6fb}
</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
