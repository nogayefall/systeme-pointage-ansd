<?php

namespace App\Command;

use App\Service\AuthService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

#[AsCommand(
    name: 'app:create-super-admin',
    description: 'Crée un compte Super Administrateur'
)]
class CreateSuperAdminCommand extends Command
{
    public function __construct(private AuthService $authService)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::OPTIONAL, 'Email du Super Admin')
            ->addArgument('password', InputArgument::OPTIONAL, 'Mot de passe')
            ->addArgument('matricule', InputArgument::OPTIONAL, 'Matricule')
            ->addArgument('nom', InputArgument::OPTIONAL, 'Nom')
            ->addArgument('prenom', InputArgument::OPTIONAL, 'Prénom');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $helper = $this->getHelper('question');

        $email = $input->getArgument('email');
        if (!$email) {
            $emailQuestion = new Question('<info>Email du Super Admin:</info> ');
            $email = $helper->ask($input, $output, $emailQuestion);
        }

        $password = $input->getArgument('password');
        if (!$password) {
            $passwordQuestion = new Question('<info>Mot de passe:</info> ');
            $passwordQuestion->setHidden(true);
            $password = $helper->ask($input, $output, $passwordQuestion);
        }

        $matricule = $input->getArgument('matricule');
        if (!$matricule) {
            $matriculeQuestion = new Question('<info>Matricule:</info> ');
            $matricule = $helper->ask($input, $output, $matriculeQuestion);
        }

        $nom = $input->getArgument('nom');
        if (!$nom) {
            $nomQuestion = new Question('<info>Nom:</info> ');
            $nom = $helper->ask($input, $output, $nomQuestion);
        }

        $prenom = $input->getArgument('prenom');
        if (!$prenom) {
            $prenomQuestion = new Question('<info>Prénom:</info> ');
            $prenom = $helper->ask($input, $output, $prenomQuestion);
        }

        try {
            $user = $this->authService->createSuperAdmin($email, $password, $matricule, $nom, $prenom);
            $output->writeln('<info>✓ Super Admin créé avec succès!</info>');
            $output->writeln("<info>Email: {$user->getEmail()}</info>");
            $output->writeln("<info>Matricule: {$user->getMatricule()}</info>");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $output->writeln("<error>✗ Erreur: {$e->getMessage()}</error>");
            return Command::FAILURE;
        }
    }
}
