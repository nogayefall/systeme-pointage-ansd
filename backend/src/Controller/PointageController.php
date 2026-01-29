<?php

namespace App\Controller;

use App\Entity\Pointage;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/pointages', name: 'api_pointages_')]
class PointageController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        // Vérifier que l'utilisateur a au moins un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN') && !$this->isGranted('ROLE_SECURITY_AGENT')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $page = max(1, (int)$request->query->get('page', 1));
        $limit = 50;
        $offset = ($page - 1) * $limit;

        $pointageRepository = $this->entityManager->getRepository(Pointage::class);
        
        $query = $pointageRepository->createQueryBuilder('p')
            ->orderBy('p.dateTime', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $pointages = $query->getQuery()->getResult();
        $total = $pointageRepository->count([]);

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
                    'id' => $pointage->getAgentSecurity()?->getId(),
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
            'pagination' => [
                'page' => $page,
                'pages' => ceil($total / $limit),
                'total' => $total,
            ],
        ]);
    }

    #[Route('/today', name: 'today', methods: ['GET'])]
    public function today(): JsonResponse
    {
        // Vérifier que l'utilisateur a au moins un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN') && !$this->isGranted('ROLE_SECURITY_AGENT')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $today = new \DateTime();
        $todayStart = (new \DateTimeImmutable())
            ->setTime(0, 0, 0);
        $todayEnd = (new \DateTimeImmutable())
            ->setTime(23, 59, 59);

        $pointageRepository = $this->entityManager->getRepository(Pointage::class);
        
        $pointages = $pointageRepository->createQueryBuilder('p')
            ->where('p.dateTime >= :start')
            ->andWhere('p.dateTime < :end')
            ->setParameter('start', $todayStart)
            ->setParameter('end', $todayEnd)
            ->orderBy('p.dateTime', 'DESC')
            ->getQuery()
            ->getResult();

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
                    'id' => $pointage->getAgentSecurity()?->getId(),
                    'nom' => $pointage->getAgentSecurity()?->getNom(),
                    'prenom' => $pointage->getAgentSecurity()?->getPrenom(),
                ],
                'type' => $pointage->getType(),
                'method' => $pointage->getMethod(),
                'datetime' => $pointage->getDateTime()?->format('Y-m-d H:i:s'),
                'notes' => $pointage->getNotes(),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => $data,
            'count' => count($data),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_SECURITY_AGENT')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->getUser();

        if (!isset($data['agentMatricule']) || empty($data['agentMatricule'])) {
            return $this->json(['error' => 'Le matricule de l\'agent est obligatoire'], 400);
        }

        // Trouver l'agent par matricule
        $agent = $this->entityManager->getRepository(User::class)
            ->findOneBy(['matricule' => $data['agentMatricule']]);

        if (!$agent) {
            return $this->json(['error' => 'Agent non trouvé avec ce matricule'], 404);
        }

        $pointage = new Pointage();
        $pointage->setAgent($agent);
        $pointage->setAgentSecurity($user);
        $pointage->setType($data['type'] ?? 'ENTRY'); // ENTRY ou EXIT
        $pointage->setMethod($data['method'] ?? 'BARCODE'); // BARCODE ou MANUAL
        $pointage->setDateTime(new \DateTimeImmutable());

        $this->entityManager->persist($pointage);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Pointage enregistré avec succès',
            'data' => [
                'id' => $pointage->getId(),
                'agent' => [
                    'matricule' => $agent->getMatricule(),
                    'nom' => $agent->getNom(),
                    'prenom' => $agent->getPrenom(),
                ],
                'datetime' => $pointage->getDateTime()->format('Y-m-d H:i:s'),
                'type' => $pointage->getType(),
                'method' => $pointage->getMethod(),
            ],
        ], 201);
    }

    #[Route('/check/{matricule}', name: 'check_agent', methods: ['GET'])]
    public function checkAgent(string $matricule): JsonResponse
    {
        // Vérifier que l'utilisateur a au moins un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN') && !$this->isGranted('ROLE_SECURITY_AGENT')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        // Trimmer et normaliser le matricule
        $matricule = trim($matricule);
        
        // Chercher directement par matricule (exact match)
        $agent = $this->entityManager->getRepository(User::class)
            ->findOneBy(['matricule' => $matricule]);

        // Si pas trouvé, essayer une recherche case-insensitive
        if (!$agent) {
            $allAgents = $this->entityManager->getRepository(User::class)->findAll();
            foreach ($allAgents as $user) {
                if (strtolower($user->getMatricule()) === strtolower($matricule)) {
                    $agent = $user;
                    break;
                }
            }
        }

        if (!$agent) {
            return $this->json(['error' => 'Agent non trouvé'], 404);
        }

        // Vérifier s'il a déjà pointé aujourd'hui
        $today = new \DateTime();
        $today->setTime(0, 0, 0);
        $tomorrow = (clone $today)->modify('+1 day');

        $pointages = $this->entityManager->getRepository(Pointage::class)
            ->createQueryBuilder('p')
            ->where('p.agent = :agent')
            ->andWhere('p.dateTime >= :start')
            ->andWhere('p.dateTime < :end')
            ->orderBy('p.dateTime', 'DESC')
            ->setParameter('agent', $agent)
            ->setParameter('start', $today)
            ->setParameter('end', $tomorrow)
            ->getQuery()
            ->getResult();

        $agentPointages = [];
        foreach ($pointages as $pointage) {
            $agentPointages[] = [
                'datetime' => $pointage->getDateTime()?->format('H:i:s'),
                'type' => $pointage->getType(),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => [
                'id' => $agent->getId(),
                'matricule' => $agent->getMatricule(),
                'nom' => $agent->getNom(),
                'prenom' => $agent->getPrenom(),
                'isActive' => $agent->isActive(),
                'pointagesToday' => $agentPointages,
                'alreadyPointed' => count($pointages) > 0,
            ],
        ]);
    }

    #[Route('/agents', name: 'list_agents', methods: ['GET'])]
    #[IsGranted('ROLE_SECURITY_AGENT')]
    public function listAgents(): JsonResponse
    {
        // Lister tous les utilisateurs avec le rôle "Agent"
        $users = $this->entityManager->getRepository(User::class)->findAll();
        
        $agents = [];
        foreach ($users as $user) {
            $roles = json_decode($user->getRoles(), true);
            if (in_array('Agent', $roles) && $user->isActive()) {
                $agents[] = [
                    'id' => $user->getId(),
                    'matricule' => $user->getMatricule(),
                    'nom' => $user->getNom(),
                    'prenom' => $user->getPrenom(),
                ];
            }
        }

        return $this->json([
            'success' => true,
            'data' => $agents,
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(Pointage $pointage): JsonResponse
    {
        // Vérifier que l'utilisateur est autorisé à supprimer
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }

        try {
            $this->entityManager->remove($pointage);
            $this->entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Pointage supprimé avec succès',
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Erreur lors de la suppression: ' . $e->getMessage(),
            ], 500);
        }
    }
}
