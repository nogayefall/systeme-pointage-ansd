<?php

namespace App\Command;

use App\Entity\Role;
use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:init-roles',
    description: 'Initialise les rôles et permissions du système'
)]
class InitRolesCommand extends Command
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $roleRepo = $this->entityManager->getRepository(Role::class);

        // Rôles à créer
        $roles = [
            ['name' => 'Super Administrateur', 'description' => 'Accès total au système'],
            ['name' => 'Administrateur RH', 'description' => 'Gestion des ressources humaines'],
            ['name' => 'Agent de Sécurité', 'description' => 'Gestion des pointages'],
            ['name' => 'Agent', 'description' => 'Employé de l\'organisation'],
        ];

        foreach ($roles as $roleData) {
            $role = $roleRepo->findByName($roleData['name']);
            if (!$role) {
                $role = new Role();
                $role->setName($roleData['name']);
                $role->setDescription($roleData['description']);
                $this->entityManager->persist($role);
                $output->writeln("<info>✓ Rôle créé: {$roleData['name']}</info>");
            } else {
                $output->writeln("<comment>⚠ Rôle existant: {$roleData['name']}</comment>");
            }
        }

        // Permissions
        $permissions = [
            ['name' => 'manage_users', 'description' => 'Gérer les utilisateurs'],
            ['name' => 'manage_roles', 'description' => 'Gérer les rôles'],
            ['name' => 'view_pointages', 'description' => 'Consulter les pointages'],
            ['name' => 'create_pointage', 'description' => 'Créer un pointage'],
            ['name' => 'view_reports', 'description' => 'Consulter les rapports'],
        ];

        $permissionRepo = $this->entityManager->getRepository(Permission::class);
        foreach ($permissions as $permData) {
            $permission = $permissionRepo->findByName($permData['name']);
            if (!$permission) {
                $permission = new Permission();
                $permission->setName($permData['name']);
                $permission->setDescription($permData['description']);
                $this->entityManager->persist($permission);
                $output->writeln("<info>✓ Permission créée: {$permData['name']}</info>");
            }
        }

        $this->entityManager->flush();
        $output->writeln('<info>✓ Initialisation terminée!</info>');

        return Command::SUCCESS;
    }
}
