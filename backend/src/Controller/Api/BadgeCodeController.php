<?php

namespace App\Controller\Api;

use App\Entity\BadgeCode;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/badge-codes', name: 'api_badge_codes_')]
#[IsGranted('ROLE_SUPER_ADMIN')]
class BadgeCodeController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(100, $request->query->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $repo = $this->entityManager->getRepository(BadgeCode::class);
        $badgeCodes = $repo->findBy([], ['id' => 'DESC'], $limit, $offset);
        $total = $repo->count([]);

        $data = array_map(function (BadgeCode $code) {
            return [
                'id' => $code->getId(),
                'badgeCode' => $code->getBadgeCode(),
                'agent' => [
                    'id' => $code->getAgent()->getId(),
                    'matricule' => $code->getAgent()->getMatricule(),
                    'nom' => $code->getAgent()->getNom(),
                    'prenom' => $code->getAgent()->getPrenom(),
                ],
            ];
        }, $badgeCodes);

        return $this->json([
            'data' => $data,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit),
            ]
        ]);
    }

    /**
     * Ajouter un nouveau mapping badge code
     * POST /api/badge-codes
     * Body: { badgeCode: "!%@%", agentId: 5 }
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['badgeCode']) || !isset($data['agentId'])) {
            return $this->json(
                ['error' => 'badgeCode et agentId sont requis'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $badgeCode = trim($data['badgeCode']);

        // Vérifier si le badge code existe déjà
        $existing = $this->entityManager->getRepository(BadgeCode::class)
            ->findByBadgeCode($badgeCode);
        if ($existing) {
            return $this->json(
                ['error' => 'Ce code badge existe déjà'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Chercher l'agent
        $agent = $this->entityManager->getRepository(User::class)
            ->find($data['agentId']);
        if (!$agent) {
            return $this->json(
                ['error' => 'Agent non trouvé'],
                Response::HTTP_NOT_FOUND
            );
        }

        // Créer le mapping
        $newBadgeCode = new BadgeCode();
        $newBadgeCode->setBadgeCode($badgeCode);
        $newBadgeCode->setAgent($agent);

        $this->entityManager->persist($newBadgeCode);
        $this->entityManager->flush();

        return $this->json([
            'message' => 'Code badge associé avec succès',
            'data' => [
                'id' => $newBadgeCode->getId(),
                'badgeCode' => $newBadgeCode->getBadgeCode(),
                'agent' => [
                    'id' => $agent->getId(),
                    'matricule' => $agent->getMatricule(),
                    'nom' => $agent->getNom(),
                    'prenom' => $agent->getPrenom(),
                ],
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * Supprimer un mapping badge code
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $badgeCode = $this->entityManager->getRepository(BadgeCode::class)->find($id);

        if (!$badgeCode) {
            return $this->json(
                ['error' => 'Code badge non trouvé'],
                Response::HTTP_NOT_FOUND
            );
        }

        $this->entityManager->remove($badgeCode);
        $this->entityManager->flush();

        return $this->json(['message' => 'Code badge supprimé']);
    }
}
