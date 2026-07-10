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

        if ((!isset($data['email']) && !isset($data['matricule'])) || !isset($data['password'])) {
            return $this->json([
                'error' => 'Identifiant (email ou matricule) et mot de passe requis'
            ], Response::HTTP_BAD_REQUEST);
        }

        if (isset($data['matricule'])) {
            $user = $this->authService->authenticateByMatricule($data['matricule'], $data['password']);
        } else {
            $user = $this->authService->authenticate($data['email'], $data['password']);
        }

        if (!$user) {
            return $this->json([
                'error' => 'Identifiants invalides'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // ⚠️ Générer le token SEULEMENT si inexistant
        if (!$user->getApiToken()) {
            $user->generateApiToken();
            $this->entityManager->flush();
        }

        // Récupérer les permissions
        $permissions = [];
        if ($user->getRole()) {
            foreach ($user->getRole()->getPermissions() as $permission) {
                $permissions[] = $permission->getName();
            }
        }

        return $this->json([
            'token' => $user->getApiToken(),
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
        ]);
    }

    #[Route('/logout', name: 'logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        $user = $this->getUser();

        if ($user) {
            // Invalider le token
            $user->setApiToken(null);
            $this->entityManager->flush();
        }

        return $this->json(['message' => 'Déconnecté avec succès']);
    }
}
