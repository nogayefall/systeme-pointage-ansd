/** Rôles techniques renvoyés par l'API (champ `roles`). */
export const ROLE = {
  SUPER: 'ROLE_SUPER_ADMIN',
  RH: 'ROLE_RH_ADMIN',
  SECURITY: 'ROLE_SECURITY_AGENT',
  SUPERVISOR: 'ROLE_SUPERVISOR',
  AGENT: 'ROLE_AGENT',
};

const has = (user, role) => Boolean(user?.roles?.includes(role));

export const isSuperAdmin = (user) => has(user, ROLE.SUPER);
/** Super administrateur ⊃ Administrateur RH (même hiérarchie que le serveur). */
export const isRh = (user) => has(user, ROLE.RH) || isSuperAdmin(user);
export const isSecurity = (user) => has(user, ROLE.SECURITY);
export const isSupervisor = (user) => has(user, ROLE.SUPERVISOR) && !isRh(user);
/** Employé qui pointe : agent ou supérieur hiérarchique (un supérieur est aussi un employé). */
export const isEmployee = (user) => has(user, ROLE.AGENT) || has(user, ROLE.SUPERVISOR);

export function homePathFor(user) {
  if (isRh(user)) return '/admin';
  if (isSecurity(user)) return '/securite';
  if (isSupervisor(user)) return '/equipe';
  return '/agent';
}

export const roleLabel = (user) => user?.role || '—';
