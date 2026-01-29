<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\AuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/auth', name: 'api_auth_')]
class AuthController extends AbstractController
{
    public function __construct(
        private AuthService $authService,
        private EntityManagerInterface $entityManager
    ) {}

    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'error' => 'Email et mot de passe requis'
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->authService->authenticate($data['email'], $data['password']);

        if (!$user) {
            return $this->json([
                'error' => 'Identifiants invalides'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Générer un token API pour l'utilisateur
        $token = $user->generateApiToken();
        $this->entityManager->flush();

        // Récupérer les permissions via le rôle
        $permissions = [];
        if ($user->getRole()) {
            foreach ($user->getRole()->getPermissions() as $permission) {
                $permissions[] = $permission->getName();
            }
        }

        return $this->json([
            'token' => $token,
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'matricule' => $user->getMatricule(),
                'nom' => $user->getNom(),
                'prenom' => $user->getPrenom(),
                'role' => $user->getRole()?->getName(),
                'roles' => $user->getRoles(),
                'permissions' => $permissions,
            ]
        ], Response::HTTP_OK);
    }

    #[Route('/me', name: 'me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        // Récupérer les permissions via le rôle
        $permissions = [];
        if ($user->getRole()) {
            foreach ($user->getRole()->getPermissions() as $permission) {
                $permissions[] = $permission->getName();
            }
        }

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'matricule' => $user->getMatricule(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'role' => $user->getRole()?->getName(),
            'roles' => $user->getRoles(),
            'permissions' => $permissions,
            'isActive' => $user->isActive(),
        ]);
    }

    #[Route('/logout', name: 'logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        return $this->json(['message' => 'Déconnecté avec succès']);
    }
}

