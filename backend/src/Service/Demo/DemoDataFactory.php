<?php

namespace App\Service\Demo;

use App\Service\WorkSchedule;

/**
 * Génère un jeu de données de démonstration réaliste (sans accès à la base).
 *
 * Le résultat est déterministe pour une même graine : on retrouve donc les mêmes
 * personnes et les mêmes identifiants à chaque exécution (seules les dates glissent
 * avec la date du jour, pour que le tableau de bord soit toujours "vivant").
 *
 * Structure retournée :
 *  - staff    : comptes (RH, sécurité, supérieurs, agents) avec leur rôle métier, service et bâtiment
 *  - departments : services et matricule de leur chef
 *  - leaves   : demandes de congé (tous statuts)
 *  - pointages: entrées / sorties sur plusieurs semaines
 */
final class DemoDataFactory
{
    public const ROLE_RH = 'Administrateur RH';
    public const ROLE_SECURITY = 'Agent de Sécurité';
    public const ROLE_SUPERVISOR = 'Supérieur hiérarchique';
    public const ROLE_AGENT = 'Agent';

    /** Services : nom => matricule du chef de service. */
    public const DEPARTMENTS = [
        'Systèmes d\'information' => '200001',
        'Démographie et statistiques sociales' => '200002',
        'Statistiques économiques' => '200003',
        'Cartographie et enquêtes' => '200004',
        'Comptabilité et finances' => '200005',
        'Moyens généraux et logistique' => '200006',
    ];

    private const AGENT_COUNT = 34;

    private const FIRST_NAMES_F = [
        'Aminata', 'Fatou', 'Awa', 'Mariama', 'Khady', 'Ndèye', 'Coumba', 'Astou', 'Rokhaya',
        'Sokhna', 'Aïssatou', 'Bineta', 'Dieynaba', 'Fatoumata', 'Marième', 'Seynabou', 'Adja',
    ];
    private const FIRST_NAMES_M = [
        'Moussa', 'Ibrahima', 'Cheikh', 'Ousmane', 'Mamadou', 'Abdoulaye', 'Modou', 'Pape',
        'Samba', 'Babacar', 'Lamine', 'Alioune', 'Serigne', 'Idrissa', 'Assane', 'Demba',
        'Oumar', 'Thierno', 'Malick', 'Bassirou',
    ];
    private const LAST_NAMES = [
        'Diallo', 'Ndiaye', 'Fall', 'Sow', 'Diop', 'Ba', 'Gueye', 'Seck', 'Sarr', 'Faye',
        'Mbaye', 'Thiam', 'Diouf', 'Sy', 'Cissé', 'Kane', 'Ndao', 'Samb', 'Tine', 'Badji',
        'Sène', 'Niang', 'Lô', 'Camara', 'Dione', 'Gaye', 'Mendy', 'Diagne', 'Wade', 'Sall',
        'Kébé', 'Touré', 'Barry', 'Ka', 'Dramé', 'Konaté',
    ];

    /**
     * Profils d'assiduité : moyenne d'arrivée (minutes depuis minuit), écart-type, probabilité d'absence.
     * Le retard se compte à partir de 08:01 (cahier des charges : début de journée à 08:00).
     */
    private const PROFILES = [
        'ponctuel' => ['mean' => 7 * 60 + 42, 'sd' => 9, 'absence' => 0.03],
        'regulier' => ['mean' => 7 * 60 + 50, 'sd' => 9, 'absence' => 0.045],
        'limite' => ['mean' => 7 * 60 + 58, 'sd' => 12, 'absence' => 0.07],
        'retardataire' => ['mean' => 8 * 60 + 10, 'sd' => 14, 'absence' => 0.10],
        'matinal' => ['mean' => 7 * 60 + 30, 'sd' => 8, 'absence' => 0.02],
    ];

    /**
     * @return array{staff: list<array<string,mixed>>, departments: array<string,string>, leaves: list<array<string,mixed>>, pointages: list<array<string,mixed>>}
     */
    public function generate(\DateTimeImmutable $now, int $weeks = 8, int $seed = 2026): array
    {
        mt_srand($seed);

        $today = $now->setTime(0, 0);
        // Début : le lundi qui ouvre la période demandée
        $start = $today->modify('-' . ($weeks * 7) . ' days');
        $start = $start->modify('monday this week');

        $staff = $this->buildStaff($start);
        $leaves = $this->buildLeaves($staff, $today);
        $pointages = $this->buildPointages($staff, $leaves, $start, $now);

        return ['staff' => $staff, 'departments' => self::DEPARTMENTS, 'leaves' => $leaves, 'pointages' => $pointages];
    }

    // ------------------------------------------------------------------ personnel

    /** @return list<array<string,mixed>> */
    private function buildStaff(\DateTimeImmutable $start): array
    {
        $staff = [];
        $usedEmails = [];

        $add = function (string $role, string $matricule, string $prenom, string $nom, string $hired, array $extra = []) use (&$staff, &$usedEmails): void {
            $email = $this->makeEmail($prenom, $nom, $usedEmails);
            $usedEmails[] = $email;
            $staff[] = array_merge([
                'role' => $role,
                'matricule' => $matricule,
                'prenom' => $prenom,
                'nom' => $nom,
                'email' => $email,
                'createdAt' => new \DateTimeImmutable($hired . ' 09:00:00'),
                'active' => true,
                'profile' => null,
                'leftOn' => null,
                'department' => null,
                'building' => 'SIEGE',
                'overtimer' => false,
            ], $extra);
        };

        // Ressources humaines
        $add(self::ROLE_RH, '900001', 'Aïssatou', 'Ndiaye', '2021-03-15');
        $add(self::ROLE_RH, '900002', 'Mamadou', 'Kane', '2023-09-04');

        // Agents de sécurité : trois au Siège (deux le matin en alternance, un le soir), deux à l'Annexe
        $add(self::ROLE_SECURITY, '800001', 'Ousmane', 'Gueye', '2020-01-20', ['shift' => 'matin-a', 'building' => 'SIEGE']);
        $add(self::ROLE_SECURITY, '800002', 'Pape Moussa', 'Sarr', '2022-06-01', ['shift' => 'matin-b', 'building' => 'SIEGE']);
        $add(self::ROLE_SECURITY, '800003', 'Modou', 'Faye', '2019-11-12', ['shift' => 'soir', 'building' => 'SIEGE']);
        $add(self::ROLE_SECURITY, '800004', 'Idrissa', 'Badji', '2021-02-08', ['shift' => 'annexe-matin', 'building' => 'ANNEXE']);
        $add(self::ROLE_SECURITY, '800005', 'Assane', 'Tine', '2023-05-22', ['shift' => 'annexe-soir', 'building' => 'ANNEXE']);

        // Supérieurs hiérarchiques : un par service, ils pointent comme les autres employés
        $chiefs = [
            ['200001', 'Cheikh Tidiane', 'Diouf', '2016-09-12', 'Systèmes d\'information', 'ponctuel', 'SIEGE'],
            ['200002', 'Mariama', 'Sy', '2015-04-06', 'Démographie et statistiques sociales', 'regulier', 'SIEGE'],
            ['200003', 'Alioune', 'Cissé', '2017-01-16', 'Statistiques économiques', 'ponctuel', 'SIEGE'],
            ['200004', 'Khadija', 'Ndao', '2018-10-01', 'Cartographie et enquêtes', 'matinal', 'ANNEXE'],
            ['200005', 'Babacar', 'Samb', '2014-06-23', 'Comptabilité et finances', 'regulier', 'SIEGE'],
            ['200006', 'Ndèye Marième', 'Sène', '2019-03-11', 'Moyens généraux et logistique', 'ponctuel', 'ANNEXE'],
        ];
        foreach ($chiefs as [$matricule, $prenom, $nom, $hired, $department, $profile, $building]) {
            $add(self::ROLE_SUPERVISOR, $matricule, $prenom, $nom, $hired, [
                'profile' => $profile, 'department' => $department, 'building' => $building, 'overtimer' => true,
            ]);
        }

        // Agents : combinaisons prénom / nom uniques, tirées de façon déterministe
        $firstNames = array_merge(self::FIRST_NAMES_F, self::FIRST_NAMES_M);
        $lastNames = self::LAST_NAMES;
        mt_srand(7); // ordre des noms stable quelle que soit la graine du reste
        shuffle($firstNames);
        shuffle($lastNames);
        mt_srand(2026);

        $profileCycle = array_merge(
            array_fill(0, 15, 'ponctuel'),
            array_fill(0, 11, 'regulier'),
            array_fill(0, 4, 'limite'),
            array_fill(0, 3, 'retardataire'),
            array_fill(0, 3, 'matinal'),
        );
        mt_srand(11);
        shuffle($profileCycle);
        mt_srand(2026);

        for ($i = 0; $i < self::AGENT_COUNT; $i++) {
            $hiredYear = 2017 + intdiv($i * 9, self::AGENT_COUNT); // 2017 → 2025
            $hired = sprintf('%d-%02d-%02d', $hiredYear, 1 + ($i * 5) % 12, 1 + ($i * 7) % 27);
            if ($i === self::AGENT_COUNT - 1) {
                $hired = $start->modify('+5 weeks')->format('Y-m-d');
            }

            $deptNames = array_keys(self::DEPARTMENTS);
            $extra = [
                'profile' => $profileCycle[$i % count($profileCycle)],
                // Le dernier agent recruté n'est pas encore rattaché à un service (cas « Sans service »).
                'department' => $i === self::AGENT_COUNT - 1 ? null : $deptNames[$i % count($deptNames)],
                'building' => ($i % 10 < 3) ? 'ANNEXE' : 'SIEGE',
                'overtimer' => ($i % 7 === 3),
            ];

            // Un agent a quitté l'agence en cours de période : compte désactivé, plus de pointages.
            if ($i === 17) {
                $extra['active'] = false;
                $extra['leftOn'] = $start->modify('+3 weeks +2 days')->setTime(0, 0);
            }

            $add(
                self::ROLE_AGENT,
                (string) (100101 + $i * 7),
                $firstNames[$i % count($firstNames)],
                $lastNames[($i * 5 + 3) % count($lastNames)],
                $hired,
                $extra
            );
        }

        return $staff;
    }

    private function makeEmail(string $prenom, string $nom, array $used): string
    {
        // Translittération explicite : iconv //TRANSLIT donne des résultats différents
        // selon le système (glibc, Windows) et rendrait les emails non reproductibles.
        $fold = static function (string $s): string {
            $s = strtr($s, [
                'à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
                'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
                'ç' => 'c', 'ñ' => 'n', 'À' => 'a', 'Â' => 'a', 'É' => 'e', 'È' => 'e', 'Ê' => 'e',
                'Î' => 'i', 'Ï' => 'i', 'Ô' => 'o', 'Ö' => 'o', 'Ù' => 'u', 'Û' => 'u', 'Ç' => 'c',
            ]);

            return strtolower(preg_replace('/[^a-zA-Z]+/', '', explode(' ', trim($s))[0]) ?? '');
        };
        $base = $fold($prenom) . '.' . $fold($nom);
        $email = $base . '@ansd.sn';
        $n = 2;
        while (in_array($email, $used, true)) {
            $email = $base . $n++ . '@ansd.sn';
        }

        return $email;
    }

    // --------------------------------------------------------------------- congés

    /**
     * @param list<array<string,mixed>> $staff
     * @return list<array<string,mixed>>
     */
    private function buildLeaves(array $staff, \DateTimeImmutable $today): array
    {
        $agents = array_values(array_filter($staff, fn ($s) => $s['role'] === self::ROLE_AGENT && $s['active']));
        $chiefs = array_values(array_filter($staff, fn ($s) => $s['role'] === self::ROLE_SUPERVISOR));
        $rh = array_values(array_filter($staff, fn ($s) => $s['role'] === self::ROLE_RH));

        // [index agent, début (jours / aujourd'hui), durée en jours OUVRÉS, motif, statut]
        $plan = [
            // Passés, approuvés
            [2, -49, 10, 'Congé annuel', 'APPROVED'],
            [5, -40, 3, 'Maladie (certificat médical)', 'APPROVED'],
            [9, -33, 2, 'Mariage d\'un proche', 'APPROVED'],
            [12, -27, 5, 'Congé annuel', 'APPROVED'],
            [14, -20, 3, 'Décès d\'un parent', 'APPROVED'],
            [20, -16, 3, 'Naissance de mon enfant', 'APPROVED'],
            [7, -9, 1, 'Rendez-vous médical', 'APPROVED'],
            [26, -6, 2, 'Maladie (certificat médical)', 'APPROVED'],
            // En cours aujourd'hui
            [4, -3, 8, 'Congé annuel', 'APPROVED'],
            [16, -1, 5, 'Congé de maladie', 'APPROVED'],
            // À venir, approuvés
            [11, 12, 10, 'Congé annuel', 'APPROVED'],
            // Un supérieur hiérarchique en congé (index >= 100 : supérieurs)
            [101, -2, 6, 'Congé annuel', 'APPROVED'],
            // En attente de décision
            [1, 20, 10, 'Congé annuel', 'PENDING'],
            [8, 34, 10, 'Congé annuel de fin d\'année', 'PENDING'],
            [18, 9, 2, 'Cérémonie familiale', 'PENDING'],
            [22, 15, 3, 'Démarches administratives', 'PENDING'],
            // Refusés
            [3, -12, 5, 'Congé annuel', 'REJECTED'],
            [10, 6, 7, 'Voyage personnel', 'REJECTED'],
            // Annulé par l'agent
            [15, 28, 4, 'Congé annuel', 'CANCELLED'],
        ];

        $leaves = [];
        foreach ($plan as $k => [$idx, $offset, $length, $reason, $status]) {
            $agent = $idx >= 100 ? $chiefs[$idx - 100] : $agents[$idx % count($agents)];
            $from = $today->modify(($offset >= 0 ? '+' : '') . $offset . ' days');
            // On commence toujours un jour ouvré
            while (!WorkSchedule::isWorkingDay($from)) {
                $from = $from->modify('+1 day');
            }
            $to = $from;
            for ($remaining = $length - 1; $remaining > 0;) {
                $to = $to->modify('+1 day');
                if (WorkSchedule::isWorkingDay($to)) {
                    $remaining--;
                }
            }

            $created = $from->modify('-' . mt_rand(8, 25) . ' days')->setTime(mt_rand(8, 16), mt_rand(0, 59), mt_rand(0, 59));
            if ($status === 'PENDING') {
                $created = $today->modify('-' . mt_rand(0, 6) . ' days')->setTime(mt_rand(8, 17), mt_rand(0, 59), mt_rand(0, 59));
            }

            $decidedBy = null;
            $decidedAt = null;
            if (in_array($status, ['APPROVED', 'REJECTED'], true)) {
                $decidedBy = $rh[$k % count($rh)]['matricule'];
                $decidedAt = $created->modify('+' . mt_rand(1, 3) . ' days')->setTime(mt_rand(9, 16), mt_rand(0, 59), mt_rand(0, 59));
                if ($decidedAt > $today->setTime(23, 59, 59)) {
                    $decidedAt = $created->modify('+1 day');
                }
            }

            $leaves[] = [
                'agent' => $agent['matricule'],
                'startDate' => $from,
                'endDate' => $to,
                'reason' => $reason,
                'status' => $status,
                'createdAt' => $created,
                'approvedBy' => $decidedBy,
                'approvedAt' => $decidedAt,
            ];
        }

        return $leaves;
    }

    // ------------------------------------------------------------------ pointages

    /**
     * @param list<array<string,mixed>> $staff
     * @param list<array<string,mixed>> $leaves
     * @return list<array<string,mixed>>
     */
    private function buildPointages(array $staff, array $leaves, \DateTimeImmutable $start, \DateTimeImmutable $now): array
    {
        // Agent de sécurité en poste : [bâtiment][créneau] => matricule
        $guards = [];
        foreach ($staff as $s) {
            if ($s['role'] === self::ROLE_SECURITY) {
                $guards[$s['building']][$s['shift']] = $s['matricule'];
            }
        }

        // Jours de congé approuvés par employé : "Y-m-d" => true
        $leaveDays = [];
        foreach ($leaves as $leave) {
            if ($leave['status'] !== 'APPROVED') {
                continue;
            }
            for ($d = $leave['startDate']; $d <= $leave['endDate']; $d = $d->modify('+1 day')) {
                $leaveDays[$leave['agent']][$d->format('Y-m-d')] = true;
            }
        }

        $events = [];
        $today = $now->setTime(0, 0);

        $guardFor = static function (string $building, string $period, int $dow) use ($guards): string {
            if ($building === 'ANNEXE') {
                return $guards['ANNEXE'][$period === 'matin' ? 'annexe-matin' : 'annexe-soir'];
            }

            return $period === 'matin' ? $guards['SIEGE'][$dow % 2 === 1 ? 'matin-a' : 'matin-b'] : $guards['SIEGE']['soir'];
        };

        for ($day = $start; $day <= $today; $day = $day->modify('+1 day')) {
            $dow = (int) $day->format('N');
            $key = $day->format('Y-m-d');
            $working = WorkSchedule::isWorkingDay($day);
            $breakMinutes = WorkSchedule::breakMinutes($day);
            $endOfDay = $dow === 5 ? 17 * 60 + 30 : 17 * 60;

            foreach ($staff as $agent) {
                if (!in_array($agent['role'], [self::ROLE_AGENT, self::ROLE_SUPERVISOR], true)) {
                    continue;
                }
                if ($day < $agent['createdAt']->setTime(0, 0)) {
                    continue;
                }
                if ($agent['leftOn'] !== null && $day >= $agent['leftOn']) {
                    continue;
                }
                if (isset($leaveDays[$agent['matricule']][$key])) {
                    continue;
                }

                // Samedi : quelques volontaires, une semaine sur quatre environ (heures supplémentaires de week-end)
                if (!$working) {
                    $weekNumber = (int) $day->format('W');
                    if ($dow !== 6 || !$agent['overtimer'] || ($weekNumber + crc32($agent['matricule'])) % 4 !== 0) {
                        continue;
                    }
                    $arrival = 8 * 60 + 30 + mt_rand(-20, 25);
                    $exit = $arrival + mt_rand(3 * 60 + 15, 4 * 60 + 45);
                    $plan = [['ENTRY', $arrival], ['EXIT', $exit]];
                } else {
                    $profile = self::PROFILES[$agent['profile']];
                    $absence = $profile['absence'] * (in_array($dow, [1, 5], true) ? 1.6 : 1.0);
                    if ($this->rand01() < $absence) {
                        continue; // absence non justifiée
                    }

                    $arrival = $this->clamp((int) round($this->gaussian($profile['mean'], $profile['sd'])), 7 * 60 + 5, 10 * 60 + 30);
                    $plan = [['ENTRY', $arrival]];

                    // Sortie ponctuelle (rendez-vous médical, démarche) : quelques jours seulement
                    if ($this->rand01() < 0.02) {
                        $out = mt_rand(10 * 60 + 20, 11 * 60 + 30);
                        $plan[] = ['EXIT', $out];
                        $plan[] = ['ENTRY', $out + mt_rand(40, 90)];
                    }

                    // Départ : 3,5 % d'oublis de pointage, 3 % de départs anticipés, 8 % de journées longues
                    $roll = $this->rand01();
                    if ($roll >= 0.035) {
                        if ($roll < 0.065) {
                            $exit = mt_rand(15 * 60 + 20, 16 * 60 + 15);
                        } elseif ($roll < 0.145 || ($agent['overtimer'] && $roll < 0.30)) {
                            $exit = mt_rand(18 * 60 + 5, 19 * 60 + 50);
                        } else {
                            // Un agent fait environ ses 8 h : départ = arrivée + 8 h + pause, à quelques minutes près
                            $exit = $arrival + WorkSchedule::NORMAL_MINUTES + $breakMinutes + (int) round($this->gaussian(-4, 15));
                            $exit = $this->clamp($exit, $endOfDay - 45, 19 * 60);
                        }
                        $plan[] = ['EXIT', max($exit, end($plan)[1] + 3 * 60)];
                    }
                }

                // Bâtiment habituel de l'employé ; de rares passages dans l'autre bâtiment
                $building = $agent['building'];
                if ($working && $this->rand01() < 0.03) {
                    $building = $building === 'SIEGE' ? 'ANNEXE' : 'SIEGE';
                }

                foreach ($plan as [$type, $minutes]) {
                    $at = $day->setTime(intdiv($minutes, 60), $minutes % 60, mt_rand(0, 59));
                    if ($at > $now) {
                        continue; // pas d'événement dans le futur
                    }

                    $manual = $this->rand01() < 0.07;
                    $events[] = [
                        'agent' => $agent['matricule'],
                        'by' => $guardFor($building, $minutes < 13 * 60 ? 'matin' : 'soir', $dow),
                        'type' => $type,
                        'building' => $building,
                        'dateTime' => $at,
                        'method' => $manual ? 'MANUAL' : 'BARCODE',
                        'notes' => $manual ? (mt_rand(0, 2) === 0 ? 'Badge défectueux' : 'Badge oublié') : null,
                    ];
                }
            }
        }

        usort($events, static fn ($a, $b) => $a['dateTime'] <=> $b['dateTime']);

        return $events;
    }

    // -------------------------------------------------------------------- outils

    private function rand01(): float
    {
        return mt_rand() / mt_getrandmax();
    }

    /** Loi normale (Box-Muller). */
    private function gaussian(float $mean, float $sd): float
    {
        $u1 = max($this->rand01(), 1e-12);
        $u2 = $this->rand01();

        return $mean + $sd * sqrt(-2.0 * log($u1)) * cos(2.0 * M_PI * $u2);
    }

    private function clamp(int $value, int $min, int $max): int
    {
        return max($min, min($max, $value));
    }
}
