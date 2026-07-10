export const formatMatricule = (matricule) => {
  const value = matricule === undefined || matricule === null ? '' : `${matricule}`.trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    return value.padStart(6, '0');
  }
  return value;
};

const leaveStatusMap = {
  PENDING: 'En attente',
  REQUEST: 'En attente',
  REQUESTED: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  CANCELED: 'Annulé',
};

export const translateLeaveStatus = (status) => {
  if (!status && status !== 0) return '—';
  return leaveStatusMap[(status || '').toUpperCase()] || status || '—';
};

export const statusBadgeClass = (status) => {
  const normalized = (status || '').toUpperCase();

  if (['APPROVED'].includes(normalized)) return 'badge-success';
  if (['PENDING', 'REQUEST', 'REQUESTED'].includes(normalized)) return 'badge-info';
  if (['REJECTED', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'badge-danger';
  return 'badge-info';
};

const pointageTypeMap = {
  ENTRY: 'ARRIVÉE',
  IN: 'ARRIVÉE',
  ARRIVEE: 'ARRIVÉE',
  DEPART: 'DÉPART',
  EXIT: 'DÉPART',
  OUT: 'DÉPART',
};

export const translatePointageType = (type) => {
  if (!type && type !== 0) return '—';
  return pointageTypeMap[(type || '').toUpperCase()] || type || '—';
};

export const pointageBadgeClass = (type) => {
  const normalized = (type || '').toUpperCase();
  return ['ENTRY', 'IN', 'ARRIVEE'].includes(normalized) ? 'badge-success' : 'badge-danger';
};
