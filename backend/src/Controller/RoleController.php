<?php

namespace App\Controller;

use App\Entity\Role;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/roles', name: 'api_roles_')]
#[IsGranted('ROLE_RH_ADMIN')]
class RoleController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
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
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || empty($data['name'])) {
            return $this->json(['error' => 'Le nom du rôle est obligatoire'], 400);
        }

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
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $role = $this->entityManager->getRepository(Role::class)->find($id);

        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name']) && !empty($data['name'])) {
            $existingRole = $this->entityManager->getRepository(Role::class)
                ->findOneBy(['name' => $data['name']]);

            if ($existingRole && $existingRole->getId() !== $id) {
                return $this->json(['error' => 'Ce nom de rôle existe déjà'], 400);
            }

            if ($role->getName() !== $data['name'] && in_array($role->getName(), \App\Security\PermissionCatalog::SYSTEM_ROLES, true)) {
                return $this->json(['error' => 'Le nom d\'un rôle système ne peut pas être modifié'], 400);
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
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $role = $this->entityManager->getRepository(Role::class)->find($id);

        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        if (in_array($role->getName(), \App\Security\PermissionCatalog::SYSTEM_ROLES, true)) {
            return $this->json(['error' => 'Ce rôle système ne peut pas être supprimé'], 400);
        }

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
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function updatePermissions(int $id, Request $request): JsonResponse
    {
        $role = $this->entityManager->getRepository(Role::class)->find($id);

        if (!$role) {
            return $this->json(['error' => 'Rôle non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['permissionIds']) || !is_array($data['permissionIds'])) {
            return $this->json(['error' => 'Le champ permissionIds est obligatoire et doit être un tableau'], 400);
        }

        foreach ($role->getPermissions() as $permission) {
            $role->removePermission($permission);
        }

        $permissionRepository = $this->entityManager->getRepository(\App\Entity\Permission::class);
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
