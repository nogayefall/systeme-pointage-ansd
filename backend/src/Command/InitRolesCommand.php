<?php

namespace App\Command;

use App\Service\RoleBootstrapper;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:init-roles',
    description: 'Crée ou met à jour les rôles de base et leurs permissions (idempotent)'
)]
class InitRolesCommand extends Command
{
    public function __construct(private RoleBootstrapper $bootstrapper)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        foreach ($this->bootstrapper->sync() as $name => $role) {
            $permissions = array_map(fn ($p) => $p->getName(), $role->getPermissions()->toArray());
            $io->writeln(sprintf('<info>✓</info> %s : %s', $name, $permissions ? implode(', ', $permissions) : 'aucune permission'));
        }

        $io->success('Rôles et permissions synchronisés.');

        return Command::SUCCESS;
    }
}
