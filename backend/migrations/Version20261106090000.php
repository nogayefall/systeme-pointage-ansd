<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute les permissions de suivi personnel des pointages et des congés';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            "INSERT INTO permission (name, description) VALUES
                ('manage_leaves', 'Approuver ou refuser les demandes de congé'),
                ('request_leave', 'Créer et annuler ses propres demandes de congé'),
                ('view_own_leaves', 'Consulter le statut et l’historique de ses demandes de congé'),
                ('view_own_pointages', 'Consulter son historique de pointage personnel')
             ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)"
        );

        $this->addSql(
            "INSERT INTO role_permission (role_id, permission_id)
             SELECT r.id, p.id
             FROM `role` r
             CROSS JOIN permission p
             WHERE (
                 (r.name IN ('Agent', 'Supérieur hiérarchique')
                     AND p.name IN ('request_leave', 'view_own_leaves', 'view_own_pointages'))
                 OR (r.name IN ('Administrateur RH', 'Super Administrateur')
                     AND p.name = 'manage_leaves')
             )
             AND NOT EXISTS (
                 SELECT 1 FROM role_permission rp
                 WHERE rp.role_id = r.id AND rp.permission_id = p.id
             )"
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql(
            "DELETE rp FROM role_permission rp
             INNER JOIN permission p ON p.id = rp.permission_id
            WHERE p.name IN ('request_leave', 'view_own_leaves', 'view_own_pointages')"
        );
        $this->addSql(
            "DELETE FROM permission
             WHERE name IN ('request_leave', 'view_own_leaves', 'view_own_pointages')"
        );
    }
}
