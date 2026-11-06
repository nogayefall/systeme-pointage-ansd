<?php

namespace App\Controller\Api;

use App\Entity\Department;
use App\Entity\User;
use App\Security\PermissionCatalog;
use App\Service\AgentDirectory;
use App\Entity\BadgeCode;
use App\Entity\LeaveRequest;
use App\Entity\Pointage;
use App\Entity\Role;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\ExpressionLanguage\Expression;

#[Route('/api/users', name: 'api_users_')]
class UserController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private AgentDirectory $directory
    ) {}

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(100, $request->query->getInt('limit', 10)));
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
        
        $qb = $userRepo->createQueryBuilder('u');
        if (isset($criteria['role'])) {
            $qb->andWhere('u.role = :role')->setParameter('role', $criteria['role']);
        }
        $q = trim((string) $request->query->get('q', ''));
        if ($q !== '') {
            $qb->andWhere('u.nom LIKE :q OR u.prenom LIKE :q OR u.matricule LIKE :q OR u.email LIKE :q')
                ->setParameter('q', '%' . addcslashes($q, '%_') . '%');
        }

        $total = (int) (clone $qb)->select('COUNT(u.id)')->getQuery()->getSingleScalarResult();
        $users = $qb->orderBy('u.nom', 'ASC')->addOrderBy('u.prenom', 'ASC')
            ->setFirstResult($offset)->setMaxResults($limit)->getQuery()->getResult();

        $data = array_map(fn (User $user) => $this->payload($user), $users);

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

    /** Employés (agents et supérieurs) visibles par l'utilisateur : tous pour la RH et la sécurité, son équipe pour un supérieur. */
    #[Route('/agents', name: 'agents', methods: ['GET'])]
    #[IsGranted(new Expression('is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SECURITY_AGENT") or is_granted("ROLE_SUPERVISOR")'))]
    public function agents(Request $request): JsonResponse
    {
        $agents = $this->directory->employees(
            $request->query->get('departmentId'),
            $request->query->get('q'),
            !$request->query->getBoolean('includeInactive')
        );
        $data = array_map(fn (User $user) => $this->payload($user), $agents);

        return $this->json([
            'data' => $data,
            'pagination' => ['page' => 1, 'limit' => count($data), 'total' => count($data), 'pages' => 1],
        ]);
    }

    /** Comptes pouvant diriger un service (rôle « Supérieur hiérarchique »). */
    #[Route('/supervisors', name: 'supervisors', methods: ['GET'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function supervisors(): JsonResponse
    {
        $users = $this->entityManager->getRepository(User::class)->createQueryBuilder('u')
            ->join('u.role', 'r')
            ->where('r.name = :role')->andWhere('u.isActive = true')
            ->setParameter('role', PermissionCatalog::ROLE_SUPERVISOR)
            ->orderBy('u.nom')->addOrderBy('u.prenom')
            ->getQuery()->getResult();

        return $this->json(['data' => array_map(fn (User $u) => $this->payload($u), $users)]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function show(int $id): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->payload($user) + ['updatedAt' => $user->getUpdatedAt()?->format('Y-m-d H:i:s')]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
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

        // Les rôles techniques (ROLE_*) sont déduits du rôle métier par User::getRoles().
        $isSimpleAgent = strtolower($role->getName()) === 'agent';
        $plainPasswordToReturn = null;

        if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse email invalide'], Response::HTTP_BAD_REQUEST);
        }

        if (isset($data['password']) && strlen((string) $data['password']) < 8) {
            return $this->json(['error' => 'Le mot de passe doit contenir au moins 8 caractères'], Response::HTTP_BAD_REQUEST);
        }

        if ($isSimpleAgent) {
            // Agent simple : email facultatif, mot de passe généré s'il n'est pas fourni
            // (il est affiché une seule fois à l'administrateur pour être remis à l'agent).
            $email = $data['email'] ?? (strtolower($data['matricule']) . '@ansd.local');
            $plainPassword = $data['password'] ?? $this->generatePassword();
            $plainPasswordToReturn = isset($data['password']) ? null : $plainPassword;
        } else {
            if (!isset($data['email']) || !isset($data['password'])) {
                return $this->json(['error' => 'Email et mot de passe requis pour ce rôle'], Response::HTTP_BAD_REQUEST);
            }
            $email = $data['email'];
            $plainPassword = $data['password'];
        }

        if ($userRepo->findByEmail($email)) {
            return $this->json(['error' => 'Email déjà utilisé'], Response::HTTP_BAD_REQUEST);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setMatricule($data['matricule']);
        $user->setNom($data['nom']);
        $user->setPrenom($data['prenom']);
        $user->setRole($role);
        $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
        $user->setMustChangePassword($isSimpleAgent && !isset($data['password']));
        $user->setIsActive(true);
        if (($error = $this->applyDepartment($user, $data)) !== null) {
            return $error;
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

    #[Route('/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Requête invalide'], Response::HTTP_BAD_REQUEST);
        }

        // Un administrateur ne peut pas se désactiver ni changer son propre rôle.
        $isSelf = $user->getId() === $this->getUser()?->getId();
        if ($isSelf && (array_key_exists('isActive', $data) || array_key_exists('roleId', $data))) {
            return $this->json(['error' => 'Vous ne pouvez pas modifier votre propre statut ou rôle'], Response::HTTP_FORBIDDEN);
        }

        if (isset($data['nom'])) {
            $user->setNom($data['nom']);
        }
        if (isset($data['prenom'])) {
            $user->setPrenom($data['prenom']);
        }
        if (isset($data['isActive'])) {
            $user->setIsActive((bool) $data['isActive']);
            if (!$user->isActive()) {
                $user->revokeApiToken(); // coupe immédiatement les sessions ouvertes
            }
        }
        if (isset($data['roleId'])) {
            $role = $this->entityManager->getRepository(Role::class)->find($data['roleId']);
            if ($role) {
                $user->setRole($role);
            }
        }

        if (($error = $this->applyDepartment($user, $data)) !== null) {
            return $error;
        }

        // Réinitialisation du mot de passe : un nouveau mot de passe est généré et affiché une seule fois.
        $plainPassword = null;
        if (!empty($data['resetPassword'])) {
            $plainPassword = $this->generatePassword();
            $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
            $user->setMustChangePassword(true);
            $user->revokeApiToken();
        }

        $user->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        $response = ['message' => 'Utilisateur mis à jour'];
        if ($plainPassword) {
            $response['plainPassword'] = $plainPassword;
        }

        return $this->json($response);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        if ($user->getId() === $this->getUser()?->getId()) {
            return $this->json(['error' => 'Vous ne pouvez pas supprimer votre propre compte'], Response::HTTP_FORBIDDEN);
        }

        // L'historique (pointages, congés, badges) doit rester cohérent : on propose la désactivation.
        $em = $this->entityManager;
        $hasHistory = $em->getRepository(Pointage::class)->count(['agent' => $user]) > 0
            || $em->getRepository(Pointage::class)->count(['agentSecurity' => $user]) > 0
            || $em->getRepository(LeaveRequest::class)->count(['user' => $user]) > 0
            || $em->getRepository(LeaveRequest::class)->count(['approvedBy' => $user]) > 0
            || $em->getRepository(BadgeCode::class)->count(['agent' => $user]) > 0;

        if ($hasHistory) {
            return $this->json([
                'error' => 'Cet utilisateur a un historique (pointages, congés ou badge). Désactivez son compte au lieu de le supprimer.',
            ], Response::HTTP_CONFLICT);
        }

        $em->remove($user);
        $em->flush();

        return $this->json(['message' => 'Utilisateur supprimé']);
    }

    /**
     * Mot de passe aléatoire lisible (sans caractères ambigus : 0/O, 1/l/I).
     */
    private function payload(User $user): array
    {
        $department = $user->getDepartment();

        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'matricule' => $user->getMatricule(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'role' => $user->getRole()?->getName(),
            'department' => $department ? ['id' => $department->getId(), 'name' => $department->getName()] : null,
            'isActive' => $user->isActive(),
            'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Rattache l'utilisateur à un service (champ « departmentId », null pour retirer).
     * Seuls les employés (agents, supérieurs) ont un service ; un utilisateur qui cesse d'être
     * supérieur ne peut plus diriger de service.
     */
    private function applyDepartment(User $user, array $data): ?JsonResponse
    {
        $roleName = $user->getRole()?->getName();

        if (array_key_exists('departmentId', $data)) {
            if ($data['departmentId'] === null || $data['departmentId'] === '') {
                $user->setDepartment(null);
            } else {
                $department = $this->entityManager->getRepository(Department::class)->find((int) $data['departmentId']);
                if (!$department) {
                    return $this->json(['error' => 'Service introuvable'], Response::HTTP_BAD_REQUEST);
                }
                $user->setDepartment($department);
            }
        }

        if (!in_array($roleName, PermissionCatalog::EMPLOYEE_ROLES, true)) {
            $user->setDepartment(null);
        }
        if ($user->getId() && $roleName !== PermissionCatalog::ROLE_SUPERVISOR) {
            $this->entityManager->createQuery('UPDATE ' . Department::class . ' d SET d.head = NULL WHERE d.head = :u')
                ->setParameter('u', $user)->execute();
        }

        return null;
    }

    private function generatePassword(int $length = 10): string
    {
        $alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $password;
    }
}
