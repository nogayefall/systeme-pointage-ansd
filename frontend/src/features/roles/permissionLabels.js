export const PERMISSION_GROUPS = [
  'Utilisateurs et rôles',
  'Pointages',
  'Congés',
  'Rapports',
  'Services et équipe',
];

export const PERMISSION_LABELS = {
  manage_users: {
    label: 'Gérer les utilisateurs',
    description: 'Créer, modifier et désactiver des comptes',
    group: 'Utilisateurs et rôles',
  },
  manage_roles: {
    label: 'Gérer les rôles',
    description: 'Modifier les rôles et leurs permissions',
    group: 'Utilisateurs et rôles',
  },
  view_pointages: {
    label: 'Voir tous les pointages',
    description: 'Consulter les pointages de tous les agents',
    group: 'Pointages',
  },
  view_own_pointages: {
    label: 'Voir son historique de pointage',
    description: 'Consulter son historique personnel de pointage',
    group: 'Pointages',
  },
  create_pointage: {
    label: 'Enregistrer un pointage',
    description: 'Saisir une entrée ou une sortie',
    group: 'Pointages',
  },
  manage_leaves: {
    label: 'Valider les congés',
    description: 'Approuver ou refuser les demandes de congé',
    group: 'Congés',
  },
  request_leave: {
    label: 'Demander un congé',
    description: 'Créer ou annuler ses propres demandes de congé',
    group: 'Congés',
  },
  view_own_leaves: {
    label: 'Suivre ses demandes de congé',
    description: 'Consulter le statut et l’historique de ses demandes',
    group: 'Congés',
  },
  view_reports: {
    label: 'Consulter les rapports',
    description: 'Voir les rapports et statistiques',
    group: 'Rapports',
  },
  export_reports: {
    label: 'Exporter les rapports',
    description: 'Télécharger les rapports en CSV ou PDF',
    group: 'Rapports',
  },
  manage_services: {
    label: 'Gérer les services',
    description: 'Créer les services, choisir leur chef et y rattacher les agents',
    group: 'Services et équipe',
  },
  view_team: {
    label: 'Voir son équipe',
    description: 'Consulter les pointages et statistiques de son équipe',
    group: 'Services et équipe',
  },
};

export function getPermissionDisplay(key) {
  return PERMISSION_LABELS[key] || { label: key, description: '', group: 'Autres permissions' };
}
