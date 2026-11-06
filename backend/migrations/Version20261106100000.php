<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Exiger le changement des mots de passe provisoires des agents';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD must_change_password TINYINT(1) DEFAULT 0 NOT NULL');
        $this->addSql("UPDATE `user` SET must_change_password = 1 WHERE role_id IN (SELECT id FROM role WHERE name IN ('Agent', 'Supérieur hiérarchique'))");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP must_change_password');
    }
}
