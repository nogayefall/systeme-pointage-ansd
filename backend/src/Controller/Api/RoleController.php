<?php

namespace App\Controller\Api;

use App\Entity\Role;
use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/roles', name: 'api_roles_')]
#[IsGranted('ROLE_SUPER_ADMIN')]
class RoleController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $roleRepo = $this->entityManager->getRepository(Role::class);
        $roles = $roleRepo->findAll();

        $data = array_map(function (Role $role) {
            return [
                'id' => $role->getId(),
                'name' => $role->getName(),
                'description' => $role->getDescription(),
                'permissions' => array_map(function (Permission $permission) {
                    return ['id' => $permission->getId(), 'name' => $permission->getName()];
                }, $role->getPermissions()->toArray()),
            ];
        }, $roles);

        return $this->json($data);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name'])) {
            return $this->json(['error' => 'Nom requis'], Response::HTTP_BAD_REQUEST);
        }

        $role = new Role();
        $role->setName($data['name']);
        $role->setDescription($data['description'] ?? null);

        $this->entityManager->persist($role);
        $this->entityManager->flush();

        return $this->json(['message' => 'Rôle créé', 'id' => $role->getId()], Response::HTTP_CREATED);
    }
}
