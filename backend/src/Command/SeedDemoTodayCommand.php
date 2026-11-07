<?php

namespace App\Command;

use App\Entity\Pointage;
use App\Entity\User;
use App\Service\Demo\DemoDataFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(
    name: 'app:seed-demo-today',
    description: 'Remplace uniquement les pointages des comptes de démonstration pour une journée'
)]
final class SeedDemoTodayCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private DemoDataFactory $factory,
        #[Autowire('%kernel.environment%')] private string $environment,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('date', null, InputOption::VALUE_REQUIRED, 'Jour à générer au format AAAA-MM-JJ (aujourd’hui par défaut)')
            ->addOption('yes', 'y', InputOption::VALUE_NONE, 'Ne demande pas de confirmation')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Autorise l’exécution hors environnement dev/test');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (!in_array($this->environment, ['dev', 'test'], true) && !$input->getOption('force')) {
            $io->error('Cette commande modifie les pointages : elle est réservée aux environnements dev/test (utiliser --force pour passer outre).');

            return Command::FAILURE;
        }

        $timezone = new \DateTimeZone('Africa/Dakar');
        $dateOption = $input->getOption('date');
        if ($dateOption === null) {
            $date = new \DateTimeImmutable('today', $timezone);
        } else {
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', (string) $dateOption, $timezone);
            $parseErrors = \DateTimeImmutable::getLastErrors();
            if (
                !$date
                || ($parseErrors !== false && ($parseErrors['warning_count'] > 0 || $parseErrors['error_count'] > 0))
                || $date->format('Y-m-d') !== $dateOption
            ) {
                $io->error('La date doit être valide et respecter le format AAAA-MM-JJ.');

                return Command::FAILURE;
            }
        }

        $day = $date->format('Y-m-d');
        $data = $this->factory->generate($date->setTime(23, 59, 59), 8);
        $pointages = array_values(array_filter(
            $data['pointages'],
            static fn (array $row): bool => $row['dateTime']->format('Y-m-d') === $day
        ));

        if ($pointages === []) {
            $io->error(sprintf('Aucun pointage de démonstration à générer le %s (jour non ouvré ou sans activité simulée).', $day));

            return Command::FAILURE;
        }

        $staffByMatricule = [];
        foreach ($data['staff'] as $row) {
            $staffByMatricule[$row['matricule']] = $row;
        }

        $users = $this->em->getRepository(User::class)->findBy([
            'matricule' => array_keys($staffByMatricule),
        ]);
        $usersByMatricule = [];
        foreach ($users as $user) {
            $usersByMatricule[$user->getMatricule()] = $user;
        }

        $requiredMatricules = [];
        foreach ($pointages as $row) {
            $requiredMatricules[$row['agent']] = true;
            $requiredMatricules[$row['by']] = true;
        }

        $missing = [];
        foreach (array_keys($requiredMatricules) as $matricule) {
            $user = $usersByMatricule[$matricule] ?? null;
            if ($user === null) {
                $missing[] = $matricule;
                continue;
            }
            if ($user->getRole()?->getName() !== $staffByMatricule[$matricule]['role']) {
                $io->error(sprintf('Le compte %s existe, mais son rôle ne correspond pas au jeu de démonstration.', $matricule));

                return Command::FAILURE;
            }
        }

        if ($missing !== []) {
            $io->error(sprintf(
                'Comptes de démonstration manquants (%s). Crée d’abord le jeu complet avec app:seed-demo.',
                implode(', ', $missing)
            ));

            return Command::FAILURE;
        }

        $demoAgentIds = [];
        foreach ($staffByMatricule as $matricule => $row) {
            if (in_array($row['role'], [DemoDataFactory::ROLE_AGENT, DemoDataFactory::ROLE_SUPERVISOR], true)) {
                $user = $usersByMatricule[$matricule] ?? null;
                if ($user?->getId() !== null) {
                    $demoAgentIds[] = $user->getId();
                }
            }
        }

        $io->warning(sprintf(
            'Les pointages existants du %s seront remplacés uniquement pour les comptes Agent et Supérieur hiérarchique du jeu de démonstration. Les autres données ne seront pas modifiées.',
            $day
        ));
        if (!$input->getOption('yes') && !$io->confirm('Continuer ?', false)) {
            $io->writeln('Annulé.');

            return Command::SUCCESS;
        }

        $start = $date->setTime(0, 0);
        $end = $start->modify('+1 day');
        $this->em->wrapInTransaction(function () use ($end, $start, $demoAgentIds, $pointages, $usersByMatricule): void {
            $this->em->createQuery(
                'DELETE FROM App\Entity\Pointage p WHERE IDENTITY(p.agent) IN (:agentIds) AND p.dateTime >= :start AND p.dateTime < :end'
            )
                ->setParameter('agentIds', $demoAgentIds)
                ->setParameter('start', $start)
                ->setParameter('end', $end)
                ->execute();

            foreach ($pointages as $row) {
                $pointage = (new Pointage())
                    ->setAgent($usersByMatricule[$row['agent']])
                    ->setAgentSecurity($usersByMatricule[$row['by']])
                    ->setType($row['type'])
                    ->setMethod($row['method'])
                    ->setBuilding($row['building'])
                    ->setNotes($row['notes'])
                    ->setDateTime($row['dateTime'])
                    ->setCreatedAt($row['dateTime']);
                $this->em->persist($pointage);
            }

            $this->em->flush();
        });

        $io->success(sprintf('%d pointages de démonstration générés pour le %s.', count($pointages), $day));

        return Command::SUCCESS;
    }
}
