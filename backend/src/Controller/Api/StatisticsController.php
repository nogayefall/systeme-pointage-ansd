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
 * Statistiques du tableau de bord. Réservé à la RH (tous les employés) et aux supérieurs
 * hiérarchiques (leur équipe uniquement). Filtre optionnel : ?departmentId=<id>|none
 */
#[Route('/api/statistics', name: 'api_statistics_')]
#[IsGranted(new Expression('is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SUPERVISOR")'))]
class StatisticsController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private AgentDirectory $directory,
        private AttendanceCalculator $calculator,
    ) {
    }

    /** KPIs d'un jour. GET /api/statistics/summary?date=2026-10-28 */
    #[Route('/summary', name: 'summary', methods: ['GET'])]
    public function summary(Request $request): JsonResponse
    {
        $date = $this->parseDate($request->query->get('date'), new \DateTimeImmutable('today'));
        if (!$date) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $agents = $this->directory->employees($request->query->get('departmentId'));
        $computed = $this->calculator->compute($agents, $date, $date);

        $present = $late = $absent = $leave = $overtime = 0;
        $byBuilding = ['SIEGE' => 0, 'ANNEXE' => 0];
        foreach ($computed as $row) {
            $day = $row['days'][0] ?? null;
            if (!$day) {
                continue;
            }
            $overtime += $day['overtimeMinutes'];
            switch ($day['status']) {
                case 'PRESENT':
                case 'LATE':
                    $present++;
                    if ($day['status'] === 'LATE') {
                        $late++;
                    }
                    if ($day['building']) {
                        $byBuilding[$day['building']] = ($byBuilding[$day['building']] ?? 0) + 1;
                    }
                    break;
                case 'LEAVE':
                    $leave++;
                    break;
                case 'ABSENT':
                    $absent++;
                    break;
            }
        }

        $total = count($agents);
        $working = WorkSchedule::isWorkingDay($date);
        $expected = $total;

        $pointages = $this->dayPointages($date, $agents);
        $entries = count(array_filter($pointages, static fn (Pointage $p) => $p->getType() === 'ENTRY'));

        return $this->json([
            'success' => true,
            'date' => $date->format('Y-m-d'),
            'kpis' => [
                'workingDay' => $working,
                'totalPointages' => count($pointages),
                'entries' => $entries,
                'exits' => count($pointages) - $entries,
                'totalAgents' => $total,
                'agentsPresent' => $present,
                'lateArrivals' => $late,
                'agentsAbsent' => $absent,
                'agentsOnLeave' => $leave,
                'attendanceRate' => $working && $expected > 0 ? round(100 * $present / $expected, 1) : null,
                'overtimeMinutes' => $overtime,
                'byBuilding' => $byBuilding,
            ],
        ]);
    }

    /** Affluence par heure. GET /api/statistics/hourly-distribution?date= */
    #[Route('/hourly-distribution', name: 'hourly_distribution', methods: ['GET'])]
    public function hourlyDistribution(Request $request): JsonResponse
    {
        $date = $this->parseDate($request->query->get('date'), new \DateTimeImmutable('today'));
        if (!$date) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $agents = $this->directory->employees($request->query->get('departmentId'));
        $buckets = [];
        for ($h = 6; $h <= 20; $h++) {
            $buckets[$h] = ['hour' => sprintf('%02d:00', $h), 'entries' => 0, 'exits' => 0];
        }
        foreach ($this->dayPointages($date, $agents) as $p) {
            $h = max(6, min(20, (int) $p->getDateTime()->format('G')));
            $buckets[$h][$p->getType() === 'ENTRY' ? 'entries' : 'exits']++;
        }

        return $this->json(['success' => true, 'date' => $date->format('Y-m-d'), 'data' => array_values($buckets)]);
    }

    /** Évolution quotidienne. GET /api/statistics/daily-trend?days=30 */
    #[Route('/daily-trend', name: 'daily_trend', methods: ['GET'])]
    public function dailyTrend(Request $request): JsonResponse
    {
        $days = max(1, min(120, $request->query->getInt('days', 7)));
        $end = new \DateTimeImmutable('today');
        $start = $end->modify('-' . ($days - 1) . ' days');

        $agents = $this->directory->employees($request->query->get('departmentId'));
        $perDay = [];
        foreach ($this->calculator->compute($agents, $start, $end) as $row) {
            foreach ($row['days'] as $d) {
                $perDay[$d['date']] ??= ['date' => $d['date'], 'present' => 0, 'late' => 0, 'absent' => 0, 'leave' => 0];
                match ($d['status']) {
                    'PRESENT' => $perDay[$d['date']]['present']++,
                    'LATE' => [$perDay[$d['date']]['present']++, $perDay[$d['date']]['late']++],
                    'LEAVE' => $perDay[$d['date']]['leave']++,
                    'ABSENT' => $perDay[$d['date']]['absent']++,
                };
            }
        }
        ksort($perDay);

        return $this->json(['success' => true, 'data' => array_values($perDay)]);
    }

    /** Assiduité par employé. GET /api/statistics/agent-attendance?dateStart=&dateEnd= */
    #[Route('/agent-attendance', name: 'agent_attendance', methods: ['GET'])]
    public function agentAttendance(Request $request): JsonResponse
    {
        $today = new \DateTimeImmutable('today');
        $start = $this->parseDate($request->query->get('dateStart'), $today->modify('-29 days'));
        $end = $this->parseDate($request->query->get('dateEnd'), $today);
        if (!$start || !$end || $start > $end) {
            return $this->json(['error' => 'Période invalide'], 400);
        }

        $agents = $this->directory->employees($request->query->get('departmentId'));
        $data = [];
        foreach ($this->calculator->compute($agents, $start, $end) as $row) {
            $data[] = ['agent' => $row['agent']->getMatricule()] + AgentDirectory::userPayload($row['agent']) + $row['totals'];
        }

        return $this->json([
            'success' => true,
            'period' => ['start' => $start->format('Y-m-d'), 'end' => $end->format('Y-m-d')],
            'agents' => $data,
        ]);
    }

    private function parseDate(mixed $value, \DateTimeImmutable $default): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return $default;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $value)) {
            return null;
        }
        try {
            return new \DateTimeImmutable((string) $value);
        } catch (\Exception) {
            return null;
        }
    }

    /** @return list<Pointage> pointages d'un jour pour les employés donnés */
    private function dayPointages(\DateTimeImmutable $date, array $agents): array
    {
        if (!$agents) {
            return [];
        }

        return $this->entityManager->createQueryBuilder()
            ->select('p')
            ->from(Pointage::class, 'p')
            ->where('p.agent IN (:agents)')
            ->andWhere('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('agents', $agents)
            ->setParameter('start', $date->setTime(0, 0))
            ->setParameter('end', $date->setTime(23, 59, 59))
            ->getQuery()
            ->getResult();
    }
}
