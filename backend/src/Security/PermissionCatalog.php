<?php

namespace App\Security;

/**
 * Source unique de vérité pour les rôles de base et leurs permissions.
 *
 * Remplace les deux commandes d'initialisation qui utilisaient des conventions
 * de nommage différentes (snake_case d'un côté, MAJUSCULES de l'autre).
 */
final class PermissionCatalog
{
    public const ROLE_SUPER_ADMIN = 'Super Administrateur';
    public const ROLE_RH = 'Administrateur RH';
    public const ROLE_SECURITY = 'Agent de Sécurité';
    public const ROLE_SUPERVISOR = 'Supérieur hiérarchique';
    public const ROLE_AGENT = 'Agent';

    /** Rôles dont les titulaires pointent (ce sont les « employés » suivis par le système). */
    public const EMPLOYEE_ROLES = [self::ROLE_AGENT, self::ROLE_SUPERVISOR];

    /** Rôles indispensables au fonctionnement : ni renommés ni supprimés. */
    public const SYSTEM_ROLES = [self::ROLE_SUPER_ADMIN, self::ROLE_RH, self::ROLE_SECURITY, self::ROLE_SUPERVISOR, self::ROLE_AGENT];

    /** @var array<string, string> nom => description */
    public const PERMISSIONS = [
        'manage_users' => 'Créer, modifier et désactiver des utilisateurs',
        'manage_roles' => 'Gérer les rôles et leurs permissions',
        'view_pointages' => 'Consulter les pointages de tous les agents',
        'create_pointage' => 'Enregistrer un pointage (entrée ou sortie)',
        'view_reports' => 'Consulter les rapports et statistiques',
        'export_reports' => 'Exporter les rapports (CSV, PDF)',
        'manage_leaves' => 'Approuver ou refuser les demandes de congé',
        'manage_services' => 'Créer les services, choisir leur chef et y rattacher les agents',
        'view_team' => 'Consulter les pointages et statistiques de son équipe',
    ];

    /** @var array<string, array{description: string, permissions: list<string>}> */
    public const ROLES = [
        self::ROLE_SUPER_ADMIN => [
            'description' => 'Accès total au système',
            'permissions' => [
                'manage_users', 'manage_roles', 'view_pointages', 'create_pointage',
                'view_reports', 'export_reports', 'manage_leaves', 'manage_services',
            ],
        ],
        self::ROLE_RH => [
            'description' => 'Gestion des ressources humaines : pointages, congés et rapports',
            'permissions' => ['view_pointages', 'view_reports', 'export_reports', 'manage_leaves', 'manage_services'],
        ],
        self::ROLE_SECURITY => [
            'description' => 'Enregistrement des pointages à l\'entrée du site',
            'permissions' => ['create_pointage', 'view_pointages'],
        ],
        self::ROLE_SUPERVISOR => [
            'description' => 'Chef de service : suit les pointages et les congés de son équipe',
            'permissions' => ['view_team'],
        ],
        self::ROLE_AGENT => [
            'description' => 'Employé de l\'agence : consulte ses pointages et demande des congés',
            'permissions' => [],
        ],
    ];

    /** Anciens noms de permissions (doublons / casse incohérente) supprimés par la synchronisation. */
    public const LEGACY_PERMISSIONS = [
        'RECORD_POINTAGE', 'EXPORT_REPORTS', 'MANAGE_SECURITY_AGENTS',
        'MANAGE_USERS', 'MANAGE_ROLES', 'VIEW_POINTAGES', 'VIEW_REPORTS',
    ];
}
