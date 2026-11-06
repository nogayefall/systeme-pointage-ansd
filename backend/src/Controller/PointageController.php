<?php

namespace App\Controller;

use App\Entity\Pointage;
use App\Entity\User;
use App\Repository\LeaveRequestRepository;
use App\Security\PermissionCatalog;
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

#[Route('/api/pointages', name: 'api_pointages_')]
class PointageController extends AbstractController
{
    private const VIEWERS = 'is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SECURITY_AGENT") or is_granted("ROLE_SUPERVISOR")';

    public function __construct(
        private EntityManagerInterface $entityManager,
        private AgentDirectory $directory,
        private AttendanceCalculator $calculator,
        private LeaveRequestRepository $leaveRepo,
    ) {
    }

    /**
     * Historique paginé (50 par défaut). Filtres : q, type, building, dateStart, dateEnd, departmentId.
     * Un supérieur hiérarchique ne voit que les pointages de son équipe.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(new Expression(self::VIEWERS))]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 50)));

        $agents = $this->directory->employees($request->query->get('departmentId'), $request->query->get('q'), false);
        if (!$agents) {
            return $this->json(['success' => true, 'data' => [], 'pagination' => ['page' => 1, 'pages' => 0, 'total' => 0, 'limit' => $limit]]);
        }

        $qb = $this->entityManager->getRepository(Pointage::class)->createQueryBuilder('p')
            ->where('p.agent IN (:agents)')->setParameter('agents', $agents);

        if (in_array($type = $request->query->get('type'), ['ENTRY', 'EXIT'], true)) {
            $qb->andWhere('p.type = :type')->setParameter('type', $type);
        }
        if (in_array($building = $request->query->get('building'), Pointage::BUILDINGS, true)) {
            $qb->andWhere('p.building = :building')->setParameter('building', $building);
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query->get('dateStart'))) {
            $qb->andWhere('p.dateTime >= :ds')->setParameter('ds', new \DateTimeImmutable($request->query->get('dateStart') . ' 00:00:00'));
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query->get('dateEnd'))) {
            $qb->andWhere('p.dateTime <= :de')->setParameter('de', new \DateTimeImmutable($request->query->get('dateEnd') . ' 23:59:59'));
        }

        $total = (int) (clone $qb)->select('COUNT(p.id)')->getQuery()->getSingleScalarResult();
        $pointages = $qb->select('p')->orderBy('p.dateTime', 'DESC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)
            ->getQuery()->getResult();

        return $this->json([
            'success' => true,
            'data' => array_map(fn (Pointage $p) => $this->payload($p), $pointages),
            'pagination' => ['page' => $page, 'pages' => (int) ceil($total / $limit), 'total' => $total, 'limit' => $limit],
        ]);
    }

    #[Route('/today', name: 'today', methods: ['GET'])]
    #[IsGranted(new Expression(self::VIEWERS))]
    public function today(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable('today');
        $agents = $this->directory->employees($request->query->get('departmentId'), null, false);

        $pointages = [];
        if ($agents) {
            $qb = $this->entityManager->getRepository(Pointage::class)->createQueryBuilder('p')
                ->where('p.agent IN (:agents)')
                ->andWhere('p.dateTime >= :start')->andWhere('p.dateTime < :end')
                ->setParameter('agents', $agents)
                ->setParameter('start', $start)
                ->setParameter('end', $start->modify('+1 day'))
                ->orderBy('p.dateTime', 'DESC');
            if (in_array($building = $request->query->get('building'), Pointage::BUILDINGS, true)) {
                $qb->andWhere('p.building = :building')->setParameter('building', $building);
            }
            $pointages = $qb->getQuery()->getResult();
        }

        return $this->json([
            'success' => true,
            'data' => array_map(fn (Pointage $p) => $this->payload($p), $pointages),
            'count' => count($pointages),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_SECURITY_AGENT')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->getUser();

        if (!is_array($data) || empty($data['agentMatricule'])) {
            return $this->json(['error' => 'Le matricule de l\'agent est obligatoire'], 400);
        }

        $type = $data['type'] ?? 'ENTRY';
        $method = $data['method'] ?? 'BARCODE';
        $building = $data['building'] ?? Pointage::BUILDING_SIEGE;
        if (!in_array($type, ['ENTRY', 'EXIT'], true) || !in_array($method, ['BARCODE', 'MANUAL'], true)) {
            return $this->json(['error' => 'Type ou méthode de pointage invalide'], 400);
        }
        if (!in_array($building, Pointage::BUILDINGS, true)) {
            return $this->json(['error' => 'Bâtiment invalide (SIEGE ou ANNEXE)'], 400);
        }

        $agent = $this->findEmployee((string) $data['agentMatricule']);
        if (!$agent) {
            return $this->json(['error' => 'Aucun agent avec ce matricule'], 404);
        }
        if (!$agent->isActive()) {
            return $this->json(['error' => 'Ce compte agent est désactivé'], 403);
        }

        // Règle métier : un agent alterne arrivée / départ au cours d'une même journée.
        $last = $this->lastPointageToday($agent);
        if ($last && $last->getType() === $type) {
            return $this->json([
                'error' => $type === 'ENTRY'
                    ? 'Cet agent a déjà pointé son arrivée. Le prochain pointage doit être un départ.'
                    : 'Cet agent a déjà pointé son départ. Le prochain pointage doit être une arrivée.',
                'suggestedType' => $type === 'ENTRY' ? 'EXIT' : 'ENTRY',
            ], 409);
        }
        if (!$last && $type === 'EXIT') {
            return $this->json(['error' => 'Cet agent n\'a pas pointé son arrivée aujourd\'hui.', 'suggestedType' => 'ENTRY'], 409);
        }

        $pointage = new Pointage();
        $pointage->setAgent($agent);
        $pointage->setAgentSecurity($user);
        $pointage->setType($type);
        $pointage->setMethod($method);
        $pointage->setBuilding($building);
        $pointage->setDateTime(new \DateTimeImmutable());

        $this->entityManager->persist($pointage);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Pointage enregistré avec succès', 'data' => $this->payload($pointage)], 201);
    }

    #[Route('/check/{matricule}', name: 'check_agent', methods: ['GET'])]
    #[IsGranted(new Expression('is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SECURITY_AGENT")'))]
    public function checkAgent(string $matricule): JsonResponse
    {
        $agent = $this->findEmployee($matricule);
        if (!$agent) {
            return $this->json(['error' => 'Aucun agent avec ce matricule'], 404);
        }

        $start = new \DateTimeImmutable('today');
        $pointages = $this->entityManager->getRepository(Pointage::class)->createQueryBuilder('p')
            ->where('p.agent = :agent')
            ->andWhere('p.dateTime >= :start')->andWhere('p.dateTime < :end')
            ->orderBy('p.dateTime', 'DESC')
            ->setParameter('agent', $agent)
            ->setParameter('start', $start)
            ->setParameter('end', $start->modify('+1 day'))
            ->getQuery()->getResult();

        return $this->json([
            'success' => true,
            'data' => [
                'id' => $agent->getId(),
                'matricule' => $agent->getMatricule(),
                'nom' => $agent->getNom(),
                'prenom' => $agent->getPrenom(),
                'department' => $agent->getDepartment()?->getName(),
                'isActive' => $agent->isActive(),
                'pointagesToday' => array_map(static fn (Pointage $p) => [
                    'datetime' => $p->getDateTime()->format('H:i:s'), 'type' => $p->getType(), 'building' => $p->getBuilding(),
                ], $pointages),
                'alreadyPointed' => count($pointages) > 0,
                'onLeaveToday' => $this->leaveRepo->hasApprovedLeaveOnDate($agent, new \DateTimeImmutable('today')),
                // Prochain pointage attendu : l'interface le présélectionne.
                'suggestedType' => (count($pointages) > 0 && $pointages[0]->getType() === 'ENTRY') ? 'EXIT' : 'ENTRY',
            ],
        ]);
    }

    /** Employés actifs, pour le pointage manuel. */
    #[Route('/agents', name: 'list_agents', methods: ['GET'])]
    #[IsGranted('ROLE_SECURITY_AGENT')]
    public function listAgents(): JsonResponse
    {
        return $this->json([
            'success' => true,
            'data' => array_map(static fn (User $u) => AgentDirectory::userPayload($u), $this->directory->employees()),
        ]);
    }

    #[Route('/my', name: 'my_pointages', methods: ['GET'])]
    #[IsGranted('ROLE_PERMISSION_VIEW_OWN_POINTAGES')]
    public function myPointages(Request $request): JsonResponse
    {
        $user = $this->getUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 50)));

        $repo = $this->entityManager->getRepository(Pointage::class);
        $pointages = $repo->createQueryBuilder('p')
            ->where('p.agent = :agent')->setParameter('agent', $user)
            ->orderBy('p.dateTime', 'DESC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)
            ->getQuery()->getResult();
        $total = $repo->count(['agent' => $user]);

        return $this->json([
            'success' => true,
            'data' => array_map(static fn (Pointage $p) => [
                'id' => $p->getId(), 'type' => $p->getType(), 'method' => $p->getMethod(),
                'building' => $p->getBuilding(), 'datetime' => $p->getDateTime()?->format('Y-m-d H:i:s'), 'notes' => $p->getNotes(),
            ], $pointages),
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'pages' => (int) ceil($total / $limit)],
        ]);
    }

    /**
     * Mon décompte du mois : pour chaque jour, arrivée, départ, heures normales, heures supplémentaires et statut
     * (présent, retard, congé, absent). GET /api/pointages/my/days?month=2026-10
     */
    #[Route('/my/days', name: 'my_days', methods: ['GET'])]
    #[IsGranted('ROLE_PERMISSION_VIEW_OWN_POINTAGES')]
    public function myDays(Request $request): JsonResponse
    {
        $month = (string) $request->query->get('month', (new \DateTimeImmutable())->format('Y-m'));
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            return $this->json(['error' => 'Mois invalide (AAAA-MM)'], 400);
        }
        $start = new \DateTimeImmutable($month . '-01');
        $end = $start->modify('last day of this month');

        $result = $this->calculator->compute([$this->getUser()], $start, $end);
        $row = reset($result);
        $days = array_reverse($row['days']);

        return $this->json(['success' => true, 'month' => $month, 'days' => $days, 'totals' => $row['totals']]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function delete(Pointage $pointage): JsonResponse
    {
        $this->entityManager->remove($pointage);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Pointage supprimé avec succès']);
    }

    /** Un pointage ne concerne que les employés (agents et supérieurs), pas les comptes d'administration. */
    private function findEmployee(string $matricule): ?User
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['matricule' => trim($matricule)]);

        return $user && in_array($user->getRole()?->getName(), PermissionCatalog::EMPLOYEE_ROLES, true) ? $user : null;
    }

    private function payload(Pointage $p): array
    {
        $agent = $p->getAgent();
        $officer = $p->getAgentSecurity();

        return [
            'id' => $p->getId(),
            'agent' => AgentDirectory::userPayload($agent),
            'securityOfficer' => ['id' => $officer?->getId(), 'nom' => $officer?->getNom(), 'prenom' => $officer?->getPrenom()],
            'type' => $p->getType(),
            'method' => $p->getMethod(),
            'building' => $p->getBuilding(),
            'datetime' => $p->getDateTime()?->format('Y-m-d H:i:s'),
            'late' => $p->getType() === 'ENTRY' && $p->getDateTime() !== null && WorkSchedule::isLate($p->getDateTime()),
            'notes' => $p->getNotes(),
        ];
    }

    private function lastPointageToday(User $agent): ?Pointage
    {
        $start = new \DateTimeImmutable('today');

        return $this->entityManager->getRepository(Pointage::class)
            ->createQueryBuilder('p')
            ->where('p.agent = :agent')
            ->andWhere('p.dateTime >= :start')->andWhere('p.dateTime < :end')
            ->orderBy('p.dateTime', 'DESC')
            ->setMaxResults(1)
            ->setParameter('agent', $agent)
            ->setParameter('start', $start)
            ->setParameter('end', $start->modify('+1 day'))
            ->getQuery()->getOneOrNullResult();
    }
}
