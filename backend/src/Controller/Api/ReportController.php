<?php

namespace App\Controller\Api;

use App\Entity\Pointage;
use App\Service\AgentDirectory;
use App\Service\AttendanceCalculator;
use App\Service\WorkSchedule;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Rapports. Réservés à la RH (tous les employés) et aux supérieurs (leur équipe).
 * Filtres communs : dateStart, dateEnd (AAAA-MM-JJ), departmentId (<id>|none).
 */
#[Route('/api/reports', name: 'api_reports_')]
#[IsGranted(new Expression('is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SUPERVISOR")'))]
class ReportController extends AbstractController
{
    private const MAX_DAYS = 366;
    private const MAX_ROWS = 5000;

    public function __construct(
        private EntityManagerInterface $entityManager,
        private AgentDirectory $directory,
        private AttendanceCalculator $calculator,
    ) {
    }

    /** Liste brute des pointages. */
    #[Route('/pointages', name: 'list_pointages', methods: ['GET'])]
    public function listPointages(Request $request): JsonResponse
    {
        [$start, $end, $error] = $this->period($request);
        if ($error) {
            return $error;
        }

        $agents = $this->scopedAgents($request);
        if (!$agents) {
            return $this->json(['success' => true, 'data' => [], 'count' => 0]);
        }

        $qb = $this->entityManager->createQueryBuilder()
            ->select('p')->from(Pointage::class, 'p')
            ->where('p.agent IN (:agents)')
            ->andWhere('p.dateTime >= :start')->andWhere('p.dateTime <= :end')
            ->setParameter('agents', $agents)
            ->setParameter('start', $start->setTime(0, 0))
            ->setParameter('end', $end->setTime(23, 59, 59))
            ->orderBy('p.dateTime', 'DESC')
            ->setMaxResults(self::MAX_ROWS);

        if (in_array($type = $request->query->get('type'), ['ENTRY', 'EXIT'], true)) {
            $qb->andWhere('p.type = :type')->setParameter('type', $type);
        }
        if (in_array($building = $request->query->get('building'), Pointage::BUILDINGS, true)) {
            $qb->andWhere('p.building = :building')->setParameter('building', $building);
        }

        $data = [];
        foreach ($qb->getQuery()->getResult() as $p) {
            $data[] = [
                'id' => $p->getId(),
                'agent' => AgentDirectory::userPayload($p->getAgent()),
                'type' => $p->getType(),
                'method' => $p->getMethod(),
                'building' => $p->getBuilding(),
                'datetime' => $p->getDateTime()->format('Y-m-d H:i:s'),
                'late' => $p->getType() === 'ENTRY' && WorkSchedule::isLate($p->getDateTime()),
            ];
        }

        return $this->json(['success' => true, 'data' => $data, 'count' => count($data)]);
    }

    /** Détail journalier : une ligne par employé et par jour (heures normales / supplémentaires / statut). */
    #[Route('/daily', name: 'daily', methods: ['GET'])]
    public function daily(Request $request): JsonResponse
    {
        [$start, $end, $error] = $this->period($request);
        if ($error) {
            return $error;
        }

        $rows = [];
        foreach ($this->calculator->compute($this->scopedAgents($request), $start, $end) as $row) {
            foreach ($row['days'] as $day) {
                $rows[] = ['agent' => AgentDirectory::userPayload($row['agent'])] + $day;
            }
        }
        usort($rows, static fn ($a, $b) => [$b['date'], $a['agent']['nom']] <=> [$a['date'], $b['agent']['nom']]);

        return $this->json(['success' => true, 'data' => array_slice($rows, 0, self::MAX_ROWS), 'count' => count($rows)]);
    }

    /**
     * Synthèse par agent, par service ou par bâtiment (?groupBy=agent|department|building).
     * Heures normales, heures supplémentaires, retards, absences et congés.
     */
    #[Route('/attendance', name: 'attendance', methods: ['GET'])]
    public function attendance(Request $request): JsonResponse
    {
        [$start, $end, $error] = $this->period($request);
        if ($error) {
            return $error;
        }
        $groupBy = $request->query->get('groupBy', 'agent');
        if (!in_array($groupBy, ['agent', 'department', 'building'], true)) {
            return $this->json(['error' => 'Regroupement invalide'], 400);
        }

        $groups = [];
        $blank = static fn (string $label, array $extra = []) => $extra + [
            'label' => $label, 'agents' => 0, 'daysExpected' => 0, 'daysWorked' => 0, 'daysLate' => 0, 'daysAbsent' => 0,
            'daysLeave' => 0, 'workedMinutes' => 0, 'normalMinutes' => 0, 'overtimeMinutes' => 0,
        ];

        foreach ($this->calculator->compute($this->scopedAgents($request), $start, $end) as $row) {
            $agent = $row['agent'];
            if ($groupBy === 'building') {
                // Un jour est rattaché au bâtiment de la première arrivée ; absences et congés n'ont pas de bâtiment.
                foreach ($row['days'] as $day) {
                    if (!$day['building']) {
                        continue;
                    }
                    $g = &$groups[$day['building']];
                    $g ??= $blank($day['building'] === 'SIEGE' ? 'Siège' : 'Annexe', ['key' => $day['building']]);
                    $g['workedMinutes'] += $day['workedMinutes'];
                    $g['normalMinutes'] += $day['normalMinutes'];
                    $g['overtimeMinutes'] += $day['overtimeMinutes'];
                    $g['daysWorked'] += $day['working'] ? 1 : 0;
                    $g['daysLate'] += $day['status'] === 'LATE' ? 1 : 0;
                    unset($g);
                }
                continue;
            }

            if ($groupBy === 'department') {
                $key = (string) ($agent->getDepartment()?->getId() ?? 'none');
                $label = $agent->getDepartment()?->getName() ?? 'Sans service';
            } else {
                $key = (string) $agent->getId();
                $label = trim($agent->getPrenom() . ' ' . $agent->getNom());
            }
            $g = &$groups[$key];
            $g ??= $blank($label, ['key' => $key] + ($groupBy === 'agent' ? ['matricule' => $agent->getMatricule()] : []));
            $g['agents']++;
            foreach (['daysExpected', 'daysWorked', 'daysLate', 'daysAbsent', 'daysLeave', 'workedMinutes', 'normalMinutes', 'overtimeMinutes'] as $f) {
                $g[$f] += $row['totals'][$f];
            }
            unset($g);
        }

        $data = array_values($groups);
        foreach ($data as &$g) {
            $g['attendanceRate'] = $g['daysExpected'] > 0 ? round(100 * $g['daysWorked'] / $g['daysExpected'], 1) : null;
        }
        unset($g);
        usort($data, static fn ($a, $b) => strcmp($a['label'], $b['label']));

        return $this->json([
            'success' => true,
            'groupBy' => $groupBy,
            'data' => $data,
            'period' => ['start' => $start->format('Y-m-d'), 'end' => $end->format('Y-m-d')],
        ]);
    }

    /**
     * Anomalies à traiter par la RH :
     *  MISSING_EXIT  arrivée sans départ (oubli de pointer en partant)
     *  MISSING_ENTRY départ sans arrivée
     *  ABSENT        jour ouvré sans aucun pointage ni congé approuvé (l'agent est considéré absent ; justificatif à demander)
     */
    #[Route('/anomalies', name: 'anomalies', methods: ['GET'])]
    public function anomalies(Request $request): JsonResponse
    {
        [$start, $end, $error] = $this->period($request, 14);
        if ($error) {
            return $error;
        }
        $filter = $request->query->get('type');

        $rows = [];
        foreach ($this->calculator->compute($this->scopedAgents($request), $start, $end) as $row) {
            foreach ($row['days'] as $day) {
                $type = $day['anomaly'] ?? ($day['status'] === 'ABSENT' ? 'ABSENT' : null);
                if ($type === null || ($filter && $filter !== $type)) {
                    continue;
                }
                $rows[] = [
                    'type' => $type,
                    'date' => $day['date'],
                    'agent' => AgentDirectory::userPayload($row['agent']),
                    'first' => $day['first'],
                    'last' => $day['last'],
                    'building' => $day['building'],
                ];
            }
        }
        usort($rows, static fn ($a, $b) => [$b['date'], $a['agent']['nom']] <=> [$a['date'], $b['agent']['nom']]);

        $counts = array_count_values(array_column($rows, 'type'));

        return $this->json([
            'success' => true,
            'data' => array_slice($rows, 0, self::MAX_ROWS),
            'summary' => [
                'MISSING_EXIT' => $counts['MISSING_EXIT'] ?? 0,
                'MISSING_ENTRY' => $counts['MISSING_ENTRY'] ?? 0,
                'ABSENT' => $counts['ABSENT'] ?? 0,
            ],
        ]);
    }

    /** @return list<\App\Entity\User> employés visibles, après filtres service et agent */
    private function scopedAgents(Request $request): array
    {
        $agents = $this->directory->employees($request->query->get('departmentId'));
        $agentId = $request->query->getInt('agentId', 0);
        if ($agentId > 0) {
            $agents = array_values(array_filter($agents, static fn ($a) => $a->getId() === $agentId));
        }

        return $agents;
    }

    /** @return array{0: ?\DateTimeImmutable, 1: ?\DateTimeImmutable, 2: ?JsonResponse} */
    private function period(Request $request, int $defaultDays = 30): array
    {
        $today = new \DateTimeImmutable('today');
        $values = [];
        foreach (['dateStart' => $today->modify('-' . ($defaultDays - 1) . ' days'), 'dateEnd' => $today] as $key => $default) {
            $raw = $request->query->get($key);
            if ($raw === null || $raw === '') {
                $values[] = $default;
                continue;
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $raw)) {
                return [null, null, $this->json(['error' => 'Format de date invalide'], 400)];
            }
            try {
                $values[] = new \DateTimeImmutable((string) $raw);
            } catch (\Exception) {
                return [null, null, $this->json(['error' => 'Format de date invalide'], 400)];
            }
        }
        [$start, $end] = $values;

        if ($start > $end) {
            return [null, null, $this->json(['error' => 'La date de début doit précéder la date de fin'], 400)];
        }
        if ($start->diff($end)->days > self::MAX_DAYS) {
            return [null, null, $this->json(['error' => 'La période ne peut pas dépasser un an'], 400)];
        }

        return [$start, $end, null];
    }
}
