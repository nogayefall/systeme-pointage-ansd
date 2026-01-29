<?php

namespace App\Controller\Api;

use App\Entity\Pointage;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports', name: 'api_reports_')]
class ReportController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    /**
     * Rapport: Pointages filtrés par période
     * GET /api/reports/pointages?dateStart=2026-01-01&dateEnd=2026-01-31&agentId=5&type=ENTRY
     */
    #[Route('/pointages', name: 'list_pointages', methods: ['GET'])]
    public function listPointages(Request $request): JsonResponse
    {
        // Vérifier l'accès
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        $dateStart = $request->query->get('dateStart');
        $dateEnd = $request->query->get('dateEnd');
        $agentId = $request->query->getInt('agentId', 0);
        $type = $request->query->get('type'); // ENTRY, EXIT, ou null pour tous

        // Valider les dates
        try {
            $startDate = $dateStart ? new \DateTime($dateStart) : (new \DateTime())->modify('-30 days');
            $endDate = $dateEnd ? new \DateTime($dateEnd) : new \DateTime();
        } catch (\Exception $e) {
            return $this->json(['error' => 'Format de date invalide'], 400);
        }

        $startDate->setTime(0, 0, 0);
        $endDate->setTime(23, 59, 59);

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $qb = $pointageRepo->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate);

        if ($agentId > 0) {
            $qb->andWhere('p.agent = :agentId')
                ->setParameter('agentId', $agentId);
        }

        if ($type) {
            $qb->andWhere('p.type = :type')
                ->setParameter('type', $type);
        }

        $pointages = $qb->orderBy('p.dateTime', 'DESC')->getQuery()->getResult();

        $data = [];
        foreach ($pointages as $pointage) {
            $data[] = [
                'id' => $pointage->getId(),
                'agent' => [
                    'id' => $pointage->getAgent()?->getId(),
                    'matricule' => $pointage->getAgent()?->getMatricule(),
                    'nom' => $pointage->getAgent()?->getNom(),
                    'prenom' => $pointage->getAgent()?->getPrenom(),
                ],
                'securityOfficer' => [
                    'nom' => $pointage->getAgentSecurity()?->getNom(),
                    'prenom' => $pointage->getAgentSecurity()?->getPrenom(),
                ],
                'type' => $pointage->getType(),
                'method' => $pointage->getMethod(),
                'datetime' => $pointage->getDateTime()?->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => $data,
            'count' => count($data),
            'filters' => [
                'dateStart' => $startDate->format('Y-m-d'),
                'dateEnd' => $endDate->format('Y-m-d'),
                'agentId' => $agentId,
                'type' => $type,
            ],
        ]);
    }

    /**
     * Rapport: Assiduité des agents
     * GET /api/reports/attendance?dateStart=2026-01-01&dateEnd=2026-01-31
     */
    #[Route('/attendance', name: 'attendance', methods: ['GET'])]
    public function attendance(Request $request): JsonResponse
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

        // Récupérer tous les agents (role = "Agent")
        $roleRepo = $this->entityManager->getRepository(\App\Entity\Role::class);
        $agentRole = $roleRepo->findOneBy(['name' => 'Agent']);
        
        $agents = [];
        if ($agentRole) {
            $agents = $this->entityManager->getRepository(User::class)
                ->findBy(['role' => $agentRole], ['matricule' => 'ASC']);
        }

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $data = [];
        foreach ($agents as $agent) {
            $pointages = $pointageRepo->createQueryBuilder('p')
                ->where('p.agent = :agent')
                ->andWhere('p.dateTime >= :start')
                ->andWhere('p.dateTime <= :end')
                ->setParameter('agent', $agent)
                ->setParameter('start', $startDate)
                ->setParameter('end', $endDate)
                ->orderBy('p.dateTime', 'ASC')
                ->getQuery()
                ->getResult();

            // Calculer les statistiques
            $daysInPeriod = (int)$endDate->diff($startDate)->format('%a') + 1;
            $pointageDates = [];
            foreach ($pointages as $pointage) {
                $date = $pointage->getDateTime()->format('Y-m-d');
                if (!isset($pointageDates[$date])) {
                    $pointageDates[$date] = [];
                }
                $pointageDates[$date][] = $pointage->getType();
            }

            $daysWorked = count($pointageDates);
            $daysAbsent = $daysInPeriod - $daysWorked;
            $lateArrivals = 0;

            foreach ($pointages as $pointage) {
                if ($pointage->getType() === 'ENTRY') {
                    $hour = (int)$pointage->getDateTime()->format('H');
                    if ($hour > 8) {
                        $lateArrivals++;
                    }
                }
            }

            $attendanceRate = $daysInPeriod > 0 ? round(($daysWorked / $daysInPeriod) * 100, 2) : 0;

            $data[] = [
                'id' => $agent->getId(),
                'matricule' => $agent->getMatricule(),
                'nom' => $agent->getNom(),
                'prenom' => $agent->getPrenom(),
                'daysInPeriod' => $daysInPeriod,
                'daysWorked' => $daysWorked,
                'daysAbsent' => $daysAbsent,
                'lateArrivals' => $lateArrivals,
                'attendanceRate' => $attendanceRate,
            ];
        }

        return $this->json([
            'success' => true,
            'data' => $data,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Rapport: Anomalies (agents sans pointage, pointages en doublon, etc.)
     * GET /api/reports/anomalies?date=2026-01-27
     */
    #[Route('/anomalies', name: 'anomalies', methods: ['GET'])]
    public function anomalies(Request $request): JsonResponse
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

        // Agents sans pointage du jour
        $roleRepo = $this->entityManager->getRepository(\App\Entity\Role::class);
        $agentRole = $roleRepo->findOneBy(['name' => 'Agent']);
        
        $allAgents = [];
        if ($agentRole) {
            $allAgents = $this->entityManager->getRepository(User::class)
                ->findBy(['role' => $agentRole, 'isActive' => true]);
        }

        $pointageRepo = $this->entityManager->getRepository(Pointage::class);
        
        $pointagesToday = $pointageRepo->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->getQuery()
            ->getResult();

        $agentsWithPointage = [];
        foreach ($pointagesToday as $pointage) {
            $agentsWithPointage[$pointage->getAgent()->getId()] = true;
        }

        $agentsWithoutPointage = [];
        foreach ($allAgents as $agent) {
            if (!isset($agentsWithPointage[$agent->getId()])) {
                $agentsWithoutPointage[] = [
                    'id' => $agent->getId(),
                    'matricule' => $agent->getMatricule(),
                    'nom' => $agent->getNom(),
                    'prenom' => $agent->getPrenom(),
                ];
            }
        }

        // Pointages en doublon (même agent, même type, même heure)
        $duplicates = [];
        $pointagesByAgent = [];
        foreach ($pointagesToday as $pointage) {
            $agentId = $pointage->getAgent()->getId();
            if (!isset($pointagesByAgent[$agentId])) {
                $pointagesByAgent[$agentId] = [];
            }
            $pointagesByAgent[$agentId][] = $pointage;
        }

        foreach ($pointagesByAgent as $agentId => $pointages) {
            for ($i = 0; $i < count($pointages) - 1; $i++) {
                $p1 = $pointages[$i];
                $p2 = $pointages[$i + 1];
                
                // Si même type et peu de différence de temps (<5 min)
                if ($p1->getType() === $p2->getType()) {
                    $diff = $p1->getDateTime()->diff($p2->getDateTime());
                    if ($diff->i < 5 && $diff->h === 0) {
                        $duplicates[] = [
                            'agent' => [
                                'matricule' => $p1->getAgent()->getMatricule(),
                                'nom' => $p1->getAgent()->getNom(),
                                'prenom' => $p1->getAgent()->getPrenom(),
                            ],
                            'type' => $p1->getType(),
                            'time1' => $p1->getDateTime()->format('H:i:s'),
                            'time2' => $p2->getDateTime()->format('H:i:s'),
                            'differenceMins' => $diff->i,
                        ];
                    }
                }
            }
        }

        return $this->json([
            'success' => true,
            'date' => $targetDate->format('Y-m-d'),
            'anomalies' => [
                'agentsWithoutPointage' => $agentsWithoutPointage,
                'duplicatePointages' => $duplicates,
            ],
            'summary' => [
                'totalAgents' => count($allAgents),
                'agentsWithPointage' => count($agentsWithPointage),
                'agentsAbsent' => count($agentsWithoutPointage),
                'duplicatesFound' => count($duplicates),
            ],
        ]);
    }
}
