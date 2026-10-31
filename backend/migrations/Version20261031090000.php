<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Services (équipes) et bâtiment de pointage :
 *  - table department (nom unique, chef de service = utilisateur) ;
 *  - user.department_id : service de l'employé ;
 *  - pointage.building : Siège ou Annexe (les pointages existants sont rattachés au Siège).
 *
 * Après cette migration : php bin/console app:init-roles  (ajoute le rôle « Supérieur hiérarchique »).
 */
final class Version20261031090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Services (équipes), chef de service et bâtiment de pointage';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE department (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, created_at DATETIME NOT NULL, head_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_CD1DE18A5E237E06 (name), INDEX IDX_CD1DE18AF41A619E (head_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE department ADD CONSTRAINT FK_CD1DE18AF41A619E FOREIGN KEY (head_id) REFERENCES `user` (id) ON DELETE SET NULL');

        $this->addSql('ALTER TABLE `user` ADD department_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE `user` ADD CONSTRAINT FK_8D93D649AE80F5DF FOREIGN KEY (department_id) REFERENCES department (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_8D93D649AE80F5DF ON `user` (department_id)');

        $this->addSql("ALTER TABLE pointage ADD building VARCHAR(10) DEFAULT 'SIEGE' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE pointage DROP building');
        $this->addSql('ALTER TABLE `user` DROP FOREIGN KEY FK_8D93D649AE80F5DF');
        $this->addSql('DROP INDEX IDX_8D93D649AE80F5DF ON `user`');
        $this->addSql('ALTER TABLE `user` DROP department_id');
        $this->addSql('ALTER TABLE department DROP FOREIGN KEY FK_CD1DE18AF41A619E');
        $this->addSql('DROP TABLE department');
    }
}
