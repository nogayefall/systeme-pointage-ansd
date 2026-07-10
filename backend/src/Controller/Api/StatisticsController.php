<?php

namespace App\Controller\Api;

use App\Entity\Pointage;
use App\Entity\User;
use App\Entity\Role;
use App\Repository\LeaveRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/statistics', name: 'api_statistics_')]
class StatisticsController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager, private LeaveRequestRepository $leaveRepo) {}

    /**
     * KPIs du jour: Total pointages, présents, retards, etc.
     * GET /api/statistics/summary?date=2026-01-27
     */
    #[Route('/summary', name: 'summary', methods: ['GET'])]
    public function summary(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        $date = $request->query->get('date', (new \DateTime())->format('Y-m-d'));
        
        try {
            $targetDate = new \DateTime($date);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $startDate = clone $targetDate;
        $startDate->setTime(0, 0, 0);
        $endDate = clone $targetDate;
        $endDate->setTime(23, 59, 59);

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        $roleRepo = $this->entityManager->getRepository(Role::class);

        // Récupérer pointages du jour
        $pointages = $pointageRepo->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->getQuery()
            ->getResult();

        // Tous les agents
        $agentRole = $roleRepo->findOneBy(['name' => 'Agent']);
        $allAgents = [];
        if ($agentRole) {
            $allAgents = $this->entityManager->getRepository(User::class)
                ->findBy(['role' => $agentRole, 'isActive' => true]);
        }

        // Calculer les stats
        $agentsPresent = [];
        $lateArrivals = 0;
        $entries = 0;
        $exits = 0;

        foreach ($pointages as $pointage) {
            $agentId = $pointage->getAgent()->getId();
            if (!isset($agentsPresent[$agentId])) {
                $agentsPresent[$agentId] = true;
            }

            if ($pointage->getType() === 'ENTRY') {
                $entries++;
                $hour = (int)$pointage->getDateTime()->format('H');
                if ($hour > 8) {
                    $lateArrivals++;
                }
            } elseif ($pointage->getType() === 'EXIT') {
                $exits++;
            }
        }

        $totalAgents = count($allAgents);
        $agentsOnLeave = 0;
        foreach ($allAgents as $agent) {
            if ($this->leaveRepo->hasApprovedLeaveOnDate($agent, $targetDate)) {
                $agentsOnLeave++; 
            }
        }

        $agentsAbsent = $totalAgents - count($agentsPresent) - $agentsOnLeave;
        // Calculer taux de présence en excluant les agents en congé
        $effectiveDenominator = ($totalAgents - $agentsOnLeave) > 0 ? ($totalAgents - $agentsOnLeave) : $totalAgents;
        $attendanceRate = $effectiveDenominator > 0 ? round((count($agentsPresent) / $effectiveDenominator) * 100, 2) : 0;

        return $this->json([
            'success' => true,
            'date' => $targetDate->format('Y-m-d'),
            'kpis' => [
                'totalPointages' => count($pointages),
                'entries' => $entries,
                'exits' => $exits,
                'totalAgents' => $totalAgents,
                'agentsPresent' => count($agentsPresent),
                'agentsAbsent' => $agentsAbsent,
                'lateArrivals' => $lateArrivals,
                'attendanceRate' => $attendanceRate,
            ],
        ]);
    }

    /**
     * Distribution horaire des pointages
     * GET /api/statistics/hourly-distribution?date=2026-01-27
     */
    #[Route('/hourly-distribution', name: 'hourly_distribution', methods: ['GET'])]
    public function hourlyDistribution(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        $date = $request->query->get('date', (new \DateTime())->format('Y-m-d'));
        
        try {
            $targetDate = new \DateTime($date);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $startDate = clone $targetDate;
        $startDate->setTime(0, 0, 0);
        $endDate = clone $targetDate;
        $endDate->setTime(23, 59, 59);

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $pointages = $pointageRepo->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->orderBy('p.dateTime', 'ASC')
            ->getQuery()
            ->getResult();

        // Grouper par heure
        $hourlyData = [];
        for ($h = 0; $h < 24; $h++) {
            $hourlyData[$h] = ['entries' => 0, 'exits' => 0];
        }

        foreach ($pointages as $pointage) {
            $hour = (int)$pointage->getDateTime()->format('H');
            if ($pointage->getType() === 'ENTRY') {
                $hourlyData[$hour]['entries']++;
            } elseif ($pointage->getType() === 'EXIT') {
                $hourlyData[$hour]['exits']++;
            }
        }

        $data = [];
        foreach ($hourlyData as $hour => $counts) {
            $data[] = [
                'hour' => str_pad($hour, 2, '0', STR_PAD_LEFT) . ':00',
                'entries' => $counts['entries'],
                'exits' => $counts['exits'],
            ];
        }

        return $this->json([
            'success' => true,
            'date' => $targetDate->format('Y-m-d'),
            'data' => $data,
        ]);
    }

    /**
     * Tendance sur N jours
     * GET /api/statistics/daily-trend?days=30
     */
    #[Route('/daily-trend', name: 'daily_trend', methods: ['GET'])]
    public function dailyTrend(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        $days = $request->query->getInt('days', 30);
        
        $endDate = new \DateTime();
        $endDate->setTime(23, 59, 59);
        
        $startDate = clone $endDate;
        $startDate->modify("-$days days");
        $startDate->setTime(0, 0, 0);

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $pointages = $pointageRepo->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->orderBy('p.dateTime', 'ASC')
            ->getQuery()
            ->getResult();

        // Grouper par date
        $dailyData = [];
        $current = clone $startDate;
        $current->setTime(0, 0, 0);
        
        while ($current <= $endDate) {
            $date = $current->format('Y-m-d');
            $dailyData[$date] = 0;
            $current->modify('+1 day');
        }

        foreach ($pointages as $pointage) {
            $date = $pointage->getDateTime()->format('Y-m-d');
            if (isset($dailyData[$date])) {
                $dailyData[$date]++;
            }
        }

        $data = [];
        foreach ($dailyData as $date => $count) {
            $data[] = [
                'date' => $date,
                'pointages' => $count,
            ];
        }

        return $this->json([
            'success' => true,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
                'days' => $days,
            ],
            'data' => $data,
        ]);
    }

    /**
     * Assiduité par agent (pie chart data)
     * GET /api/statistics/agent-attendance?dateStart=2026-01-01&dateEnd=2026-01-31
     */
    #[Route('/agent-attendance', name: 'agent_attendance', methods: ['GET'])]
    public function agentAttendance(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        $dateStart = $request->query->get('dateStart');
        $dateEnd = $request->query->get('dateEnd');

        try {
            $startDate = $dateStart ? new \DateTime($dateStart) : (new \DateTime())->modify('-30 days');
            $endDate = $dateEnd ? new \DateTime($dateEnd) : new \DateTime();
        } catch (\Exception $e) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $startDate->setTime(0, 0, 0);
        $endDate->setTime(23, 59, 59);

        $roleRepo = $this->entityManager->getRepository(Role::class);
        $agentRole = $roleRepo->findOneBy(['name' => 'Agent']);
        
        $agents = [];
        if ($agentRole) {
            $agents = $this->entityManager->getRepository(User::class)
                ->findBy(['role' => $agentRole, 'isActive' => true], ['matricule' => 'ASC']);
        }

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $daysInPeriod = (int)$endDate->diff($startDate)->format('%a') + 1;
        
        $data = [];
        $attendanceStats = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
        ];

        foreach ($agents as $agent) {
            $pointages = $pointageRepo->createQueryBuilder('p')
                ->where('p.agent = :agent')
                ->andWhere('p.dateTime >= :start')
                ->andWhere('p.dateTime <= :end')
                ->setParameter('agent', $agent)
                ->setParameter('start', $startDate)
                ->setParameter('end', $endDate)
                ->getQuery()
                ->getResult();

            $pointageDates = [];
            $lateCount = 0;
            
            foreach ($pointages as $pointage) {
                $date = $pointage->getDateTime()->format('Y-m-d');
                if (!isset($pointageDates[$date])) {
                    $pointageDates[$date] = true;
                }
                
                if ($pointage->getType() === 'ENTRY') {
                    $hour = (int)$pointage->getDateTime()->format('H');
                    if ($hour > 8) {
                        $lateCount++;
                    }
                }
            }


            $daysWorked = count($pointageDates);
            // Nombre de jours de congé approuvés dans la période
            $daysOnLeave = $this->leaveRepo->countApprovedDaysBetween($agent, $startDate, $endDate);
            $daysAbsent = $daysInPeriod - $daysWorked - $daysOnLeave;

            $attendanceStats['present'] += ($daysWorked > 0 ? 1 : 0);
            $attendanceStats['absent'] += ($daysAbsent > 0 ? 1 : 0);
            $attendanceStats['late'] += ($lateCount > 0 ? 1 : 0);

            $data[] = [
                'agent' => $agent->getMatricule(),
                'nom' => $agent->getNom() . ' ' . $agent->getPrenom(),
                'daysWorked' => $daysWorked,
                'daysAbsent' => $daysAbsent,
                'lateArrivals' => $lateCount,
                'attendanceRate' => $daysInPeriod > 0 ? round(($daysWorked / $daysInPeriod) * 100, 2) : 0,
            ];
        }

        return $this->json([
            'success' => true,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'agents' => $data,
            'summary' => $attendanceStats,
        ]);
    }
}
