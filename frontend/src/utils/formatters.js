const pad = (n) => String(n).padStart(2, '0');

/** Convertit « 2026-10-28 08:12:03 » (heure locale du serveur) en Date locale. */
export function parseDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

export const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => toIsoDate(new Date());

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = parseDateTime(value);
  return d ? d.toLocaleDateString('fr-FR', opts) : '—';
}

export function formatLongDate(value) {
  const d = parseDateTime(value);
  if (!d) return '—';
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(value) {
  const d = parseDateTime(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '—';
}

export function formatDateTime(value) {
  const d = parseDateTime(value);
  return d ? `${formatDate(d)} à ${formatTime(d)}` : '—';
}

/** 485 → « 8 h 05 » ; 0 → « 0 h 00 » */
export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} h ${pad(m)}`;
}

export const fullName = (u) => (u ? `${u.prenom || ''} ${u.nom || ''}`.trim() : '—');

export const initials = (u) => {
  if (!u) return '?';
  return `${(u.prenom || '').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase() || '?';
};

/* Vocabulaire unique pour toute l'application. */
export const TYPE_LABEL = { ENTRY: 'Arrivée', EXIT: 'Départ' };
export const METHOD_LABEL = { BARCODE: 'Code-barres', MANUAL: 'Manuel' };
export const BUILDING_LABEL = { SIEGE: 'Siège', ANNEXE: 'Annexe' };

/** Statut d'un agent pour un jour (calculé par le serveur). Un congé approuvé n'est pas une absence. */
export const DAY_STATUS = {
  PRESENT: { label: 'Présent', tone: 'success' },
  LATE: { label: 'Retard', tone: 'warning' },
  LEAVE: { label: 'Congé', tone: 'info' },
  ABSENT: { label: 'Absent', tone: 'danger' },
};

export const ANOMALY_LABEL = {
  MISSING_EXIT: { label: 'Départ non pointé', tone: 'warning' },
  MISSING_ENTRY: { label: 'Arrivée non pointée', tone: 'warning' },
  ABSENT: { label: 'Absent sans justificatif', tone: 'danger' },
};

export const LEAVE_STATUS = {
  PENDING: { label: 'En attente', tone: 'warning' },
  APPROVED: { label: 'Approuvé', tone: 'success' },
  REJECTED: { label: 'Refusé', tone: 'danger' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' },
};

/** Retard : première arrivée après 08:00 (même règle que le serveur). */
export const WORK_START = { hour: 8, minute: 0 };
export function isLate(value) {
  const d = parseDateTime(value);
  if (!d) return false;
  return d.getHours() * 60 + d.getMinutes() > WORK_START.hour * 60 + WORK_START.minute;
}

/** Nombre de jours ouvrés (lun–ven) entre deux dates ISO incluses. */
export function workingDays(startIso, endIso) {
  const a = parseDateTime(startIso);
  const b = parseDateTime(endIso);
  if (!a || !b || a > b) return 0;
  let n = 0;
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) n += 1;
  }
  return n;
}

export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/** « Awa Diop » + matricule → objet utilisateur minimal pour <PersonCell>. */
export function personFromName(full, matricule) {
  const parts = (full || '').trim().split(/\s+/);
  return { prenom: parts[0] || '', nom: parts.slice(1).join(' '), matricule };
}

