<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260123113526 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE badge_code (id INT AUTO_INCREMENT NOT NULL, badge_code VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, agent_id INT NOT NULL, INDEX IDX_D31BDC813414710B (agent_id), INDEX idx_badge_code (badge_code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE badge_code ADD CONSTRAINT FK_D31BDC813414710B FOREIGN KEY (agent_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE pointage ADD CONSTRAINT FK_7591B203414710B FOREIGN KEY (agent_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE pointage ADD CONSTRAINT FK_7591B20FD701954 FOREIGN KEY (agent_security_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886D60322AC FOREIGN KEY (role_id) REFERENCES `role` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user ADD CONSTRAINT FK_8D93D649D60322AC FOREIGN KEY (role_id) REFERENCES `role` (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE badge_code DROP FOREIGN KEY FK_D31BDC813414710B');
        $this->addSql('DROP TABLE badge_code');
        $this->addSql('ALTER TABLE pointage DROP FOREIGN KEY FK_7591B203414710B');
        $this->addSql('ALTER TABLE pointage DROP FOREIGN KEY FK_7591B20FD701954');
        $this->addSql('ALTER TABLE role_permission DROP FOREIGN KEY FK_6F7DF886D60322AC');
        $this->addSql('ALTER TABLE role_permission DROP FOREIGN KEY FK_6F7DF886FED90CCA');
        $this->addSql('ALTER TABLE `user` DROP FOREIGN KEY FK_8D93D649D60322AC');
    }
}
