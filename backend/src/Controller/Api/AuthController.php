<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Security\LoginThrottler;
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
        private EntityManagerInterface $entityManager,
        private LoginThrottler $throttler
    ) {}

    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Requête invalide'], Response::HTTP_BAD_REQUEST);
        }

        $identifier = trim((string) ($data['matricule'] ?? $data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($identifier === '' || $password === '') {
            return $this->json(['error' => 'Identifiant (email ou matricule) et mot de passe requis'], Response::HTTP_BAD_REQUEST);
        }

        $ip = (string) $request->getClientIp();

        if ($this->throttler->isLocked($ip, $identifier)) {
            return $this->json(
                ['error' => 'Trop de tentatives échouées. Réessayez dans quelques minutes.'],
                Response::HTTP_TOO_MANY_REQUESTS
            );
        }

        $user = isset($data['matricule'])
            ? $this->authService->authenticateByMatricule($identifier, $password)
            : $this->authService->authenticate($identifier, $password);

        if (!$user) {
            $this->throttler->registerFailure($ip, $identifier);

            return $this->json(['error' => 'Identifiants invalides'], Response::HTTP_UNAUTHORIZED);
        }

        $this->throttler->reset($ip, $identifier);

        // Nouveau jeton à chaque connexion ; seule son empreinte est conservée.
        $token = $user->issueApiToken();
        $this->entityManager->flush();

        return $this->json([
            'token' => $token,
            'expiresAt' => $user->getApiTokenExpiresAt()?->format(\DATE_ATOM),
            'user' => $this->userPayload($user),
        ]);
    }

    #[Route('/me', name: 'me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->userPayload($user));
    }

    #[Route('/logout', name: 'logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $user->revokeApiToken();
        $this->entityManager->flush();

        return $this->json(['message' => 'Déconnecté avec succès']);
    }

    private function userPayload(User $user): array
    {
        $permissions = [];
        foreach ($user->getRole()?->getPermissions() ?? [] as $permission) {
            $permissions[] = $permission->getName();
        }

        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'matricule' => $user->getMatricule(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'role' => $user->getRole()?->getName(),
            'department' => $user->getDepartment()?->getName(),
            'roles' => array_values($user->getRoles()),
            'permissions' => $permissions,
        ];
    }
}
