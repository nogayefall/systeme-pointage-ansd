<?php

namespace App\Command;

use App\Entity\LeaveRequest;
use App\Entity\Pointage;
use App\Entity\Role;
use App\Entity\User;
use App\Security\PermissionCatalog;
use App\Service\Demo\DemoDataFactory;
use App\Service\RoleBootstrapper;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:seed-demo',
    description: 'Remplace les données par un jeu de démonstration réaliste (comptes, services, pointages, congés)'
)]
class SeedDemoCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private RoleBootstrapper $bootstrapper,
        private DemoDataFactory $factory,
        #[Autowire('%kernel.project_dir%')] private string $projectDir,
        #[Autowire('%kernel.environment%')] private string $environment,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('password', 'p', InputOption::VALUE_REQUIRED, 'Mot de passe commun des comptes de démo', 'Ansd@2026')
            ->addOption('weeks', 'w', InputOption::VALUE_REQUIRED, 'Nombre de semaines de pointages à générer', '8')
            ->addOption('output', 'o', InputOption::VALUE_REQUIRED, 'Fichier CSV des identifiants générés', 'demo-identifiants.csv')
            ->addOption('yes', 'y', InputOption::VALUE_NONE, 'Ne demande pas de confirmation')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Autorise l\'exécution hors environnement dev/test');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (!in_array($this->environment, ['dev', 'test'], true) && !$input->getOption('force')) {
            $io->error('Cette commande efface les données : elle est réservée aux environnements dev/test (utiliser --force pour passer outre).');

            return Command::FAILURE;
        }

        $password = (string) $input->getOption('password');
        if (strlen($password) < 8) {
            $io->error('Le mot de passe doit contenir au moins 8 caractères.');

            return Command::FAILURE;
        }
        $weeks = max(1, min(26, (int) $input->getOption('weeks')));

        $io->warning([
            'Cette commande SUPPRIME tous les pointages, congés, badges et tous les utilisateurs',
            'sauf les comptes « Super Administrateur », puis crée des données de démonstration.',
        ]);
        if (!$input->getOption('yes') && !$io->confirm('Continuer ?', false)) {
            $io->writeln('Annulé.');

            return Command::SUCCESS;
        }

        $roles = $this->bootstrapper->sync();
        $now = new \DateTimeImmutable();
        $data = $this->factory->generate($now, $weeks);

        // Le mot de passe est identique pour tous les comptes de démo : on ne le hache qu'une fois.
        $hash = $this->hasher->hashPassword(new User(), $password);

        /** @var array<string, User> $users matricule => utilisateur */
        $users = [];

        $this->em->wrapInTransaction(function () use ($data, $roles, $hash, &$users): void {
            // 1. Nettoyage (enfants d'abord, à cause des clés étrangères)
            foreach ([Pointage::class, LeaveRequest::class, \App\Entity\BadgeCode::class, \App\Entity\Department::class] as $entity) {
                $this->em->createQuery(sprintf('DELETE FROM %s e', $entity))->execute();
            }
            $this->em->createQuery('DELETE FROM App\Entity\User u WHERE u.role <> :superAdmin')
                ->setParameter('superAdmin', $roles[PermissionCatalog::ROLE_SUPER_ADMIN])
                ->execute();
            $this->em->clear();

            // 2. Comptes
            $roles = $this->reloadRoles();
            foreach ($data['staff'] as $row) {
                $user = (new User())
                    ->setEmail($row['email'])
                    ->setMatricule($row['matricule'])
                    ->setNom($row['nom'])
                    ->setPrenom($row['prenom'])
                    ->setRole($roles[$row['role']])
                    ->setRoles([])
                    ->setPassword($hash)
                    ->setIsActive($row['active'])
                    ->setCreatedAt($row['createdAt']);
                $this->em->persist($user);
                $users[$row['matricule']] = $user;
            }
            $this->em->flush();

            // 2 bis. Services : chacun a son chef ; les employés sont rattachés à leur service
            $departments = [];
            foreach ($data['departments'] as $name => $headMatricule) {
                $department = (new \App\Entity\Department())->setName($name)->setHead($users[$headMatricule]);
                $this->em->persist($department);
                $departments[$name] = $department;
            }
            foreach ($data['staff'] as $row) {
                if ($row['department'] !== null) {
                    $users[$row['matricule']]->setDepartment($departments[$row['department']]);
                }
            }
            $this->em->flush();

            // 3. Congés
            foreach ($data['leaves'] as $row) {
                $leave = (new LeaveRequest())
                    ->setUser($users[$row['agent']])
                    ->setStartDate(\DateTime::createFromImmutable($row['startDate']))
                    ->setEndDate(\DateTime::createFromImmutable($row['endDate']))
                    ->setReason($row['reason'])
                    ->setStatus($row['status'])
                    ->setCreatedAt($row['createdAt']);
                if ($row['approvedBy']) {
                    $leave->setApprovedBy($users[$row['approvedBy']])->setApprovedAt($row['approvedAt']);
                }
                $this->em->persist($leave);
            }
            $this->em->flush();

            // 4. Pointages
            $i = 0;
            foreach ($data['pointages'] as $row) {
                $pointage = (new Pointage())
                    ->setAgent($users[$row['agent']])
                    ->setAgentSecurity($users[$row['by']])
                    ->setType($row['type'])
                    ->setMethod($row['method'])
                    ->setBuilding($row['building'])
                    ->setNotes($row['notes'])
                    ->setDateTime($row['dateTime'])
                    ->setCreatedAt($row['dateTime']);
                $this->em->persist($pointage);

                if (++$i % 1000 === 0) {
                    $this->em->flush();
                }
            }
            $this->em->flush();
        });

        $csv = $this->writeCredentials($data['staff'], $password, (string) $input->getOption('output'));

        $kept = $this->em->getRepository(User::class)->findBy(['role' => $this->reloadRoles()[PermissionCatalog::ROLE_SUPER_ADMIN]]);
        $io->success(sprintf(
            '%d comptes, %d demandes de congé et %d pointages créés. %d compte(s) Super Administrateur conservé(s).',
            count($data['staff']),
            count($data['leaves']),
            count($data['pointages']),
            count($kept)
        ));

        $io->table(
            ['Rôle', 'Nom', 'Matricule', 'Email'],
            array_map(
                fn ($s) => [$s['role'], $s['prenom'] . ' ' . $s['nom'], $s['matricule'], $s['email']],
                array_merge(
                    array_slice(array_values(array_filter($data['staff'], fn ($s) => $s['role'] !== DemoDataFactory::ROLE_AGENT)), 0, 9),
                    array_slice(array_values(array_filter($data['staff'], fn ($s) => $s['role'] === DemoDataFactory::ROLE_AGENT && $s['active'])), 0, 3)
                )
            )
        );
        $io->writeln(sprintf('Mot de passe de tous les comptes de démo : <info>%s</info>', $password));
        $io->writeln(sprintf('Liste complète des identifiants : <info>%s</info>', $csv));

        return Command::SUCCESS;
    }

    /** @return array<string, Role> */
    private function reloadRoles(): array
    {
        $roles = [];
        foreach ($this->em->getRepository(Role::class)->findAll() as $role) {
            $roles[$role->getName()] = $role;
        }

        return $roles;
    }

    /** @param list<array<string,mixed>> $staff */
    private function writeCredentials(array $staff, string $password, string $file): string
    {
        $path = str_starts_with($file, '/') ? $file : $this->projectDir . '/' . $file;
        $handle = fopen($path, 'wb');
        fwrite($handle, "\xEF\xBB\xBF"); // BOM : Excel ouvre correctement les accents
        fputcsv($handle, ['role', 'prenom', 'nom', 'matricule', 'email', 'mot_de_passe', 'service', 'batiment', 'statut'], ';');
        foreach ($staff as $s) {
            fputcsv($handle, [$s['role'], $s['prenom'], $s['nom'], $s['matricule'], $s['email'], $password, $s['department'] ?? '', in_array($s['role'], ['Agent', 'Supérieur hiérarchique', 'Agent de Sécurité'], true) ? ($s['building'] === 'ANNEXE' ? 'Annexe' : 'Siège') : '', $s['active'] ? 'actif' : 'désactivé'], ';');
        }
        fclose($handle);

        return $path;
    }
}
