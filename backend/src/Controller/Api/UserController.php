<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\Role;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[Route('/api/users', name: 'api_users_')]
class UserController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher
    ) {}

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function list(Request $request): JsonResponse
    {
        $page = $request->query->getInt('page', 1);
        $limit = $request->query->getInt('limit', 10);
        $offset = ($page - 1) * $limit;
        $roleFilter = $request->query->get('role');

        $userRepo = $this->entityManager->getRepository(User::class);
        
        $criteria = [];
        if ($roleFilter) {
            // Chercher par le nom du rôle
            $role = $this->entityManager->getRepository(Role::class)
                ->findOneBy(['name' => $roleFilter]);
            if ($role) {
                $criteria['role'] = $role;
            }
        }
        
        $users = $userRepo->findBy($criteria, ['id' => 'DESC'], $limit, $offset);
        $total = count($userRepo->findBy($criteria));

        $data = array_map(function (User $user) {
            return [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'matricule' => $user->getMatricule(),
                'nom' => $user->getNom(),
                'prenom' => $user->getPrenom(),
                'role' => $user->getRole()?->getName(),
                'isActive' => $user->isActive(),
                'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        }, $users);

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

    #[Route('/agents', name: 'agents', methods: ['GET'])]
    public function agents(Request $request): JsonResponse
    {
        // Vérifier que l'utilisateur a au moins un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN') && !$this->isGranted('ROLE_SECURITY_AGENT')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $userRepo = $this->entityManager->getRepository(User::class);
        $roleRepo = $this->entityManager->getRepository(Role::class);

        // Chercher le rôle "Agent" 
        $agentRole = $roleRepo->findOneBy(['name' => 'Agent']);

        // Récupérer TOUS les utilisateurs avec le rôle Agent
        $agents = [];
        if ($agentRole) {
            $agents = $userRepo->findBy(['role' => $agentRole], ['matricule' => 'ASC']);
        }

        $data = array_map(function (User $user) {
            return [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'matricule' => $user->getMatricule(),
                'nom' => $user->getNom(),
                'prenom' => $user->getPrenom(),
                'role' => $user->getRole()?->getName(),
                'isActive' => $user->isActive(),
                'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        }, $agents);

        return $this->json([
            'data' => $data,
            'pagination' => [
                'page' => 1,
                'limit' => count($agents),
                'total' => count($agents),
                'pages' => 1,
            ]
        ]);
    }
    public function show(int $id): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'matricule' => $user->getMatricule(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'role' => $user->getRole()?->getName(),
            'isActive' => $user->isActive(),
            'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updatedAt' => $user->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Champs toujours requis
        $required = ['matricule', 'nom', 'prenom', 'roleId'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return $this->json(['error' => "Champ requis: $field"], Response::HTTP_BAD_REQUEST);
            }
        }

        $userRepo = $this->entityManager->getRepository(User::class);
        
        // Vérifier le matricule
        if ($userRepo->findByMatricule($data['matricule'])) {
            return $this->json(['error' => 'Matricule déjà utilisé'], Response::HTTP_BAD_REQUEST);
        }

        // Trouver le rôle
        $role = $this->entityManager->getRepository(Role::class)->find($data['roleId']);
        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], Response::HTTP_BAD_REQUEST);
        }

        // Générer le rôle RBAC basé sur le nom du rôle
        $rbacRoles = $this->generateRbacRoles($role->getName());

        // Vérifier si c'est un agent simple (pas de compte)
        $isSimpleAgent = strtolower($role->getName()) === 'agent';

        $plainPasswordToReturn = null;

        if ($isSimpleAgent) {
            // Agent simple: créer un compte utilisable (matricule + password)
            $user = new User();
            $user->setMatricule($data['matricule']);
            $user->setNom($data['nom']);
            $user->setPrenom($data['prenom']);
            $user->setRole($role);
            $user->setRoles($rbacRoles);

            // Email générique si non fourni
            $email = $data['email'] ?? ('agent-' . uniqid() . '@ansd.local');
            $user->setEmail($email);

            // Déterminer le mot de passe en clair : si l'admin en fournit un, l'utiliser,
            // sinon utiliser le matricule comme mot de passe par défaut pour faciliter la connexion.
            $plainPassword = $data['password'] ?? $data['matricule'];
            $hashedPassword = $this->passwordHasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashedPassword);
            $user->setIsActive(true);

            // Préparer pour l'inclure dans la réponse (à communiquer à l'agent)
            $plainPasswordToReturn = $plainPassword;
        } else {
            // Utilisateur avec compte: email et password requis
            if (!isset($data['email']) || !isset($data['password'])) {
                return $this->json(
                    ['error' => 'Email et mot de passe requis pour ce rôle'],
                    Response::HTTP_BAD_REQUEST
                );
            }

            if ($userRepo->findByEmail($data['email'])) {
                return $this->json(['error' => 'Email déjà utilisé'], Response::HTTP_BAD_REQUEST);
            }

            $user = new User();
            $user->setEmail($data['email']);
            $user->setMatricule($data['matricule']);
            $user->setNom($data['nom']);
            $user->setPrenom($data['prenom']);
            $user->setRole($role);
            $user->setRoles($rbacRoles);
            $hashedPassword = $this->passwordHasher->hashPassword($user, $data['password']);
            $user->setPassword($hashedPassword);
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $response = [
            'message' => 'Utilisateur créé avec succès',
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'matricule' => $user->getMatricule(),
            ]
        ];

        if ($plainPasswordToReturn) {
            $response['plainPassword'] = $plainPasswordToReturn;
        }

        return $this->json($response, Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['nom'])) {
            $user->setNom($data['nom']);
        }
        if (isset($data['prenom'])) {
            $user->setPrenom($data['prenom']);
        }
        if (isset($data['isActive'])) {
            $user->setIsActive($data['isActive']);
        }
        if (isset($data['roleId'])) {
            $role = $this->entityManager->getRepository(Role::class)->find($data['roleId']);
            if ($role) {
                $user->setRole($role);
            }
        }

        $user->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $this->json(['message' => 'Utilisateur mis à jour']);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($user);
        $this->entityManager->flush();

        return $this->json(['message' => 'Utilisateur supprimé']);
    }

    /**
     * Génère les rôles RBAC basé sur le nom du rôle
     */
    private function generateRbacRoles(string $roleName): array
    {
        $roles = [];
        $normalizedName = strtoupper(str_replace(' ', '_', $roleName));
        
        // Mapper les noms de rôles aux rôles RBAC
        $roleMapping = [
            'SUPER_ADMINISTRATEUR' => 'ROLE_SUPER_ADMIN',
            'ADMINISTRATEUR' => 'ROLE_ADMIN',
            'RH_ADMIN' => 'ROLE_RH_ADMIN',
            'AGENT_DE_SÉCURITÉ' => 'ROLE_SECURITY_AGENT',
            'AGENT_DE_SECURITE' => 'ROLE_SECURITY_AGENT',
            'SECURITY_AGENT' => 'ROLE_SECURITY_AGENT',
            'AGENT' => 'ROLE_AGENT',
        ];

        // Chercher le rôle correspondant
        foreach ($roleMapping as $key => $rbacRole) {
            if (strpos($normalizedName, $key) !== false || $key === $normalizedName) {
                $roles[] = $rbacRole;
                break;
            }
        }

        // Si aucun rôle n'a été trouvé, assigner ROLE_USER par défaut
        if (empty($roles)) {
            $roles[] = 'ROLE_USER';
        }

        return $roles;
    }
}

