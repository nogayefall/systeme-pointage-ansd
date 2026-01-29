<?php

namespace App\Controller;

use App\Entity\Role;
use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/roles', name: 'api_roles_')]
class RoleController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        // Vérifier que l'utilisateur a au moins un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $roles = $this->entityManager->getRepository(Role::class)->findAll();
        
        $data = [];
        foreach ($roles as $role) {
            $permissions = [];
            foreach ($role->getPermissions() as $permission) {
                $permissions[] = [
                    'id' => $permission->getId(),
                    'name' => $permission->getName(),
                    'description' => $permission->getDescription(),
                ];
            }
            
            $data[] = [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => $permissions,
                'usersCount' => count($role->getUsers()),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        // Vérifier que l'utilisateur a au least un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $role = $this->entityManager->getRepository(Role::class)->find($id);
        
        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        $permissions = [];
        foreach ($role->getPermissions() as $permission) {
            $permissions[] = [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => $permissions,
                'usersCount' => count($role->getUsers()),
            ],
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        // Vérifier que l'utilisateur a au least un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || empty($data['name'])) {
            return $this->json(['error' => 'Le nom du rôle est obligatoire'], 400);
        }

        // Vérifier si le rôle existe déjà
        $existingRole = $this->entityManager->getRepository(Role::class)
            ->findOneBy(['name' => $data['name']]);
        
        if ($existingRole) {
            return $this->json(['error' => 'Ce rôle existe déjà'], 400);
        }

        $role = new Role();
        $role->setName($data['name']);
        $role->setDescription($data['description'] ?? null);

        $this->entityManager->persist($role);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Rôle créé avec succès',
            'data' => [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => [],
            ],
        ], 201);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        // Vérifier que l'utilisateur a au least un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $role = $this->entityManager->getRepository(Role::class)->find($id);
        
        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name']) && !empty($data['name'])) {
            // Vérifier que le nom n'existe pas déjà
            $existingRole = $this->entityManager->getRepository(Role::class)
                ->findOneBy(['name' => $data['name']]);
            
            if ($existingRole && $existingRole->getId() !== $id) {
                return $this->json(['error' => 'Ce nom de rôle existe déjà'], 400);
            }
            
            $role->setName($data['name']);
        }

        if (isset($data['description'])) {
            $role->setDescription($data['description']);
        }

        $this->entityManager->flush();

        $permissions = [];
        foreach ($role->getPermissions() as $permission) {
            $permissions[] = [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ];
        }

        return $this->json([
            'success' => true,
            'message' => 'Rôle modifié avec succès',
            'data' => [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => $permissions,
            ],
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        // Vérifier que l'utilisateur a au least un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $role = $this->entityManager->getRepository(Role::class)->find($id);
        
        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        // Vérifier que le rôle n'est pas assigné à des utilisateurs
        if (count($role->getUsers()) > 0) {
            return $this->json(['error' => 'Ce rôle est assigné à des utilisateurs et ne peut pas être supprimé'], 400);
        }

        $this->entityManager->remove($role);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Rôle supprimé avec succès',
        ]);
    }

    #[Route('/{id}/permissions', name: 'update_permissions', methods: ['PUT'])]
    public function updatePermissions(int $id, Request $request): JsonResponse
    {
        // Vérifier que l'utilisateur a au least un des rôles autorisés
        if (!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_RH_ADMIN')) {
            return $this->json(['error' => 'Accès non autorisé'], 403);
        }
        $role = $this->entityManager->getRepository(Role::class)->find($id);
        
        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['permissionIds']) || !is_array($data['permissionIds'])) {
            return $this->json(['error' => 'Le champ permissionIds est obligatoire et doit être un tableau'], 400);
        }

        // Vider les permissions existantes
        foreach ($role->getPermissions() as $permission) {
            $role->removePermission($permission);
        }

        // Ajouter les nouvelles permissions
        $permissionRepository = $this->entityManager->getRepository(Permission::class);
        foreach ($data['permissionIds'] as $permissionId) {
            $permission = $permissionRepository->find($permissionId);
            if ($permission) {
                $role->addPermission($permission);
            }
        }

        $this->entityManager->flush();

        $permissions = [];
        foreach ($role->getPermissions() as $permission) {
            $permissions[] = [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ];
        }

        return $this->json([
            'success' => true,
            'message' => 'Permissions mises à jour avec succès',
            'data' => [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => $permissions,
            ],
        ]);
    }
}
