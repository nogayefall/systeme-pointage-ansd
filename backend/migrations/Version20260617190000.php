<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add leave_request table for leave management';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE leave_request (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, reason VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, approved_by_id INT DEFAULT NULL, approved_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, INDEX IDX_LEAVE_USER (user_id), INDEX IDX_LEAVE_APPROVED_BY (approved_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE leave_request ADD CONSTRAINT FK_LEAVE_USER FOREIGN KEY (user_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE leave_request ADD CONSTRAINT FK_LEAVE_APPROVED_BY FOREIGN KEY (approved_by_id) REFERENCES `user` (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE leave_request DROP FOREIGN KEY FK_LEAVE_USER');
        $this->addSql('ALTER TABLE leave_request DROP FOREIGN KEY FK_LEAVE_APPROVED_BY');
        $this->addSql('DROP TABLE leave_request');
    }
}
