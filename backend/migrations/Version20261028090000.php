<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Remise à niveau de la base :
 *  - tables en InnoDB (MyISAM, le moteur par défaut de WAMP/XAMPP, ignorait toutes les clés étrangères) ;
 *  - suppression des lignes orphelines accumulées pendant ce temps ;
 *  - (re)création des clés étrangères manquantes ;
 *  - jetons d'API hachés avec date d'expiration (les anciens jetons en clair sont invalidés) ;
 *  - colonne "roles" remise à zéro : les rôles techniques sont déduits de la table "role" ;
 *  - index sur les pointages pour les statistiques.
 *
 * Après cette migration, lancer : php bin/console app:init-roles
 */
final class Version20261028090000 extends AbstractMigration
{
    private const TABLES = ['user', 'role', 'permission', 'role_permission', 'pointage', 'leave_request', 'badge_code', 'messenger_messages'];

    public function getDescription(): string
    {
        return 'InnoDB, clés étrangères, jetons d\'API hachés avec expiration, nettoyage des orphelins';
    }

    public function up(Schema $schema): void
    {
        // 1. Moteur transactionnel avec intégrité référentielle
        foreach (self::TABLES as $table) {
            $this->addSql(sprintf('ALTER TABLE `%s` ENGINE = InnoDB', $table));
        }

        // 2. Lignes orphelines (impossibles avec des clés étrangères, mais présentes sous MyISAM)
        $this->addSql('DELETE FROM role_permission WHERE role_id NOT IN (SELECT id FROM role) OR permission_id NOT IN (SELECT id FROM permission)');
        $this->addSql('DELETE FROM badge_code WHERE agent_id NOT IN (SELECT id FROM `user`)');
        $this->addSql('DELETE FROM pointage WHERE agent_id NOT IN (SELECT id FROM `user`) OR agent_security_id NOT IN (SELECT id FROM `user`)');
        $this->addSql('DELETE FROM leave_request WHERE user_id NOT IN (SELECT id FROM `user`)');
        $this->addSql('UPDATE leave_request SET approved_by_id = NULL WHERE approved_by_id IS NOT NULL AND approved_by_id NOT IN (SELECT id FROM `user`)');

        // 3. Jetons d'API : empreinte + expiration
        $this->addSql('ALTER TABLE `user` ADD api_token_expires_at DATETIME DEFAULT NULL');
        $this->addSql('UPDATE `user` SET api_token = NULL'); // les anciens jetons étaient stockés en clair

        // 4. Les rôles techniques (ROLE_*) sont déduits du rôle métier par User::getRoles()
        $this->addSql("UPDATE `user` SET roles = '[]'");

        // 5. Index pour les statistiques et les listes de pointages
        $this->addSql('CREATE INDEX idx_pointage_datetime ON pointage (date_time)');

        // 6. Clés étrangères manquantes (uniquement celles qui n'existent pas déjà)
        $existing = $this->connection->fetchFirstColumn(
            "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'"
        );

        $foreignKeys = [
            'FK_8D93D649D60322AC' => 'ALTER TABLE `user` ADD CONSTRAINT FK_8D93D649D60322AC FOREIGN KEY (role_id) REFERENCES `role` (id)',
            'FK_6F7DF886D60322AC' => 'ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886D60322AC FOREIGN KEY (role_id) REFERENCES `role` (id) ON DELETE CASCADE',
            'FK_6F7DF886FED90CCA' => 'ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE',
            'FK_7591B203414710B' => 'ALTER TABLE pointage ADD CONSTRAINT FK_7591B203414710B FOREIGN KEY (agent_id) REFERENCES `user` (id)',
            'FK_7591B20FD701954' => 'ALTER TABLE pointage ADD CONSTRAINT FK_7591B20FD701954 FOREIGN KEY (agent_security_id) REFERENCES `user` (id)',
            'FK_D31BDC813414710B' => 'ALTER TABLE badge_code ADD CONSTRAINT FK_D31BDC813414710B FOREIGN KEY (agent_id) REFERENCES `user` (id)',
            'FK_LEAVE_USER' => 'ALTER TABLE leave_request ADD CONSTRAINT FK_LEAVE_USER FOREIGN KEY (user_id) REFERENCES `user` (id)',
            'FK_LEAVE_APPROVED_BY' => 'ALTER TABLE leave_request ADD CONSTRAINT FK_LEAVE_APPROVED_BY FOREIGN KEY (approved_by_id) REFERENCES `user` (id)',
        ];

        foreach ($foreignKeys as $name => $sql) {
            if (!in_array($name, $existing, true)) {
                $this->addSql($sql);
            }
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_pointage_datetime ON pointage');
        $this->addSql('ALTER TABLE `user` DROP api_token_expires_at');
        // Le retour à MyISAM et la suppression des clés étrangères ne sont volontairement pas rejoués :
        // revenir à un moteur sans intégrité n'a aucun intérêt.
    }
}
