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
    name: 'app:create-security-agent',
    description: 'Crée un utilisateur agent de sécurité',
)]
class CreateSecurityAgentCommand extends Command
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
        
        // Vérifier si un agent existe déjà
        $agentExists = $userRepo->findByEmail('agent@ansd.sn');
        if ($agentExists) {
            $output->writeln('Agent de sécurité déjà existant');
            return Command::SUCCESS;
        }

        // Créer ou récupérer le rôle Agent de Sécurité
        $roleRepo = $this->entityManager->getRepository(Role::class);
        $securityRole = $roleRepo->findOneBy(['name' => 'Agent de Sécurité']);

        if (!$securityRole) {
            // Si le rôle n'existe pas, le créer
            $securityRole = new Role();
            $securityRole->setName('Agent de Sécurité');
            $securityRole->setDescription('Agent de sécurité pour l\'enregistrement des pointages');
            $this->entityManager->persist($securityRole);
            $this->entityManager->flush();
        }

        // Créer l'utilisateur agent de sécurité
        $agent = new User();
        $agent->setEmail('agent@ansd.sn');
        $agent->setMatricule('AGENT001');
        $agent->setNom('Agent');
        $agent->setPrenom('Sécurité');
        $agent->setRole($securityRole);
        $agent->setRoles(['ROLE_SECURITY_AGENT']);
        $agent->setIsActive(true);

        // Hasher le mot de passe
        $hashedPassword = $this->passwordHasher->hashPassword($agent, 'agent123');
        $agent->setPassword($hashedPassword);

        $this->entityManager->persist($agent);
        $this->entityManager->flush();

        $output->writeln('Agent de sécurité créé avec succès!');
        $output->writeln('Email: agent@ansd.sn');
        $output->writeln('Mot de passe: agent123');
        $output->writeln('Rôles: ' . implode(', ', $agent->getRoles()));

        return Command::SUCCESS;
    }
}
