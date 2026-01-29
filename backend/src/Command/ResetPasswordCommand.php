<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:reset-password',
    description: 'Réinitialise le mot de passe d\'un utilisateur',
)]
class ResetPasswordCommand extends Command
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
        
        // Récupérer l'utilisateur admin
        $user = $userRepo->findByEmail('admin@ansd.sn');
        if (!$user) {
            $output->writeln('Utilisateur non trouvé');
            return Command::FAILURE;
        }

        // Réinitialiser le mot de passe
        $newPassword = 'admin123';
        $hashedPassword = $this->passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($hashedPassword);

        $this->entityManager->flush();

        $output->writeln('Mot de passe réinitialisé!');
        $output->writeln("Email: admin@ansd.sn");
        $output->writeln("Mot de passe: $newPassword");

        return Command::SUCCESS;
    }
}
