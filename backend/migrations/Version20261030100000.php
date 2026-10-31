<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Aligne le nom de deux index de leave_request sur la convention de Doctrine,
 * pour que « doctrine:schema:validate » ne signale plus aucun écart.
 */
final class Version20261030100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Renomme les index de leave_request selon la convention Doctrine';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE leave_request RENAME INDEX idx_leave_user TO IDX_7DC8F778A76ED395');
        $this->addSql('ALTER TABLE leave_request RENAME INDEX idx_leave_approved_by TO IDX_7DC8F7782D234F6A');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE leave_request RENAME INDEX IDX_7DC8F778A76ED395 TO idx_leave_user');
        $this->addSql('ALTER TABLE leave_request RENAME INDEX IDX_7DC8F7782D234F6A TO idx_leave_approved_by');
    }
}
