<?php

namespace App\Command;

use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:init-permissions',
    description: 'Initialize default permissions in the database',
)]
class InitPermissionsCommand extends Command
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $defaultPermissions = [
            ['name' => 'MANAGE_USERS', 'description' => 'Créer, modifier et supprimer des utilisateurs'],
            ['name' => 'MANAGE_ROLES', 'description' => 'Gérer les rôles et les permissions'],
            ['name' => 'VIEW_POINTAGES', 'description' => 'Voir les pointages'],
            ['name' => 'RECORD_POINTAGE', 'description' => 'Enregistrer un pointage'],
            ['name' => 'EXPORT_REPORTS', 'description' => 'Exporter les rapports'],
            ['name' => 'VIEW_REPORTS', 'description' => 'Voir les rapports'],
            ['name' => 'MANAGE_SECURITY_AGENTS', 'description' => 'Gérer les agents de sécurité'],
        ];

        $permissionRepository = $this->entityManager->getRepository(Permission::class);

        foreach ($defaultPermissions as $permData) {
            $existingPermission = $permissionRepository->findOneBy(['name' => $permData['name']]);
            
            if ($existingPermission) {
                $io->writeln('<comment>Permission "' . $permData['name'] . '" already exists, skipping...</comment>');
                continue;
            }

            $permission = new Permission();
            $permission->setName($permData['name']);
            $permission->setDescription($permData['description']);

            $this->entityManager->persist($permission);
            $io->writeln('<info>Created permission: ' . $permData['name'] . '</info>');
        }

        $this->entityManager->flush();
        $io->success('All default permissions have been initialized!');

        return Command::SUCCESS;
    }
}
