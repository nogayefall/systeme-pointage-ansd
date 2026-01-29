<?php

namespace App\Command;

use App\Entity\Role;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Crée un utilisateur administrateur',
)]
class CreateAdminCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $userRepo = $this->entityManager->getRepository(User::class);
        
        // Vérifier si un admin existe déjà
        $adminExists = $userRepo->findByEmail('admin@ansd.sn');
        if ($adminExists) {
            $output->writeln('Admin déjà existant');
            return Command::SUCCESS;
        }

        // Créer ou récupérer le rôle Super Admin
        $roleRepo = $this->entityManager->getRepository(Role::class);
        $superAdminRole = $roleRepo->findOneBy(['name' => 'Super Administrateur']);

        if (!$superAdminRole) {
            $superAdminRole = new Role();
            $superAdminRole->setName('Super Administrateur');
            $superAdminRole->setDescription('Administrateur avec accès complet');
            $this->entityManager->persist($superAdminRole);
            $this->entityManager->flush();
        }

        // Créer l'utilisateur admin
        $admin = new User();
        $admin->setEmail('admin@ansd.sn');
        $admin->setMatricule('ADMIN001');
        $admin->setNom('Admin');
        $admin->setPrenom('Système');
        $admin->setRole($superAdminRole);
        $admin->setRoles(['ROLE_SUPER_ADMIN']);
        $admin->setIsActive(true);

        // Hasher le mot de passe
        $hashedPassword = $this->passwordHasher->hashPassword($admin, 'password');
        $admin->setPassword($hashedPassword);

        $this->entityManager->persist($admin);
        $this->entityManager->flush();

        $output->writeln('Admin créé avec succès!');
        $output->writeln('Email: admin@ansd.sn');
        $output->writeln('Password: password');

        return Command::SUCCESS;
    }
}
