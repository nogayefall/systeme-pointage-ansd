import { isRh, isSecurity, isSuperAdmin, isSupervisor } from '../../utils/roles';

const item = (to, label, icon, end = false) => ({ to, label, icon, end });

export function navigationFor(user) {
  if (isRh(user)) {
    const administration = [
      ...(isSuperAdmin(user) ? [item('/admin/utilisateurs', 'Utilisateurs', 'users')] : []),
      item('/admin/services', 'Services', 'list'),
      ...(isSuperAdmin(user)
        ? [
            item('/admin/roles', 'Rôles et permissions', 'shield'),
            item('/admin/badges', 'Badges', 'badge'),
          ]
        : []),
    ];

    return [
      {
        title: 'Espace de travail',
        items: [
          item('/admin', 'Tableau de bord', 'dashboard', true),
          item('/admin/pointages', 'Pointages', 'clock'),
          item('/admin/conges', 'Congés', 'calendar'),
          item('/admin/rapports', 'Rapports', 'file'),
        ],
      },
      { title: 'Administration', items: administration },
    ];
  }

  if (isSecurity(user)) {
    return [{ title: 'Espace de travail', items: [item('/securite', 'Pointage', 'scan', true)] }];
  }

  if (isSupervisor(user)) {
    return [
      {
        title: 'Mon équipe',
        items: [
          item('/equipe', 'Tableau de bord', 'dashboard', true),
          item('/equipe/pointages', 'Pointages', 'clock'),
          item('/equipe/rapports', 'Rapports', 'file'),
        ],
      },
      {
        title: 'Mon espace',
        items: [
          item('/agent', 'Accueil', 'home', true),
          item('/agent/pointages', 'Mes pointages', 'user'),
          item('/agent/conges', 'Mes congés', 'calendar'),
        ],
      },
    ];
  }

  return [
    {
      title: 'Espace de travail',
      items: [
        item('/agent', 'Accueil', 'home', true),
        item('/agent/pointages', 'Mes pointages', 'clock'),
        item('/agent/conges', 'Mes congés', 'calendar'),
      ],
    },
  ];
}
