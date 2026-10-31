<?php

namespace App\Controller;

use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/permissions', name: 'api_permissions_')]
#[IsGranted('ROLE_RH_ADMIN')]
class PermissionController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $permissions = $this->entityManager->getRepository(Permission::class)->findAll();
        
        $data = [];
        foreach ($permissions as $permission) {
            $data[] = [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ];
        }

        return $this->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || empty($data['name'])) {
            return $this->json(['error' => 'Le nom de la permission est obligatoire'], 400);
        }

        // Vérifier si la permission existe déjà
        $existingPermission = $this->entityManager->getRepository(Permission::class)
            ->findOneBy(['name' => $data['name']]);
        
        if ($existingPermission) {
            return $this->json(['error' => 'Cette permission existe déjà'], 400);
        }

        $permission = new Permission();
        $permission->setName($data['name']);
        $permission->setDescription($data['description'] ?? null);

        $this->entityManager->persist($permission);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Permission créée avec succès',
            'data' => [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ],
        ], 201);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $permission = $this->entityManager->getRepository(Permission::class)->find($id);
        
        if (!$permission) {
            return $this->json(['error' => 'Permission non trouvée'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name']) && !empty($data['name'])) {
            $existingPermission = $this->entityManager->getRepository(Permission::class)
                ->findOneBy(['name' => $data['name']]);
            
            if ($existingPermission && $existingPermission->getId() !== $id) {
                return $this->json(['error' => 'Ce nom de permission existe déjà'], 400);
            }
            
            $permission->setName($data['name']);
        }

        if (isset($data['description'])) {
            $permission->setDescription($data['description']);
        }

        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Permission modifiée avec succès',
            'data' => [
                'id' => $permission->getId(),
                'name' => $permission->getName(),
                'description' => $permission->getDescription(),
            ],
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $permission = $this->entityManager->getRepository(Permission::class)->find($id);
        
        if (!$permission) {
            return $this->json(['error' => 'Permission non trouvée'], 404);
        }

        $this->entityManager->remove($permission);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Permission supprimée avec succès',
        ]);
    }
}
