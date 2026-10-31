<?php

namespace App\Controller\Api;

use App\Entity\Department;
use App\Entity\User;
use App\Security\PermissionCatalog;
use App\Service\AgentDirectory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Services (équipes). La RH et le super administrateur les gèrent ;
 * un supérieur hiérarchique voit seulement les services qu'il dirige.
 */
#[Route('/api/services', name: 'api_services_')]
class DepartmentController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private AgentDirectory $directory,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(new Expression('is_granted("ROLE_RH_ADMIN") or is_granted("ROLE_SUPERVISOR")'))]
    public function list(): JsonResponse
    {
        $qb = $this->em->getRepository(Department::class)->createQueryBuilder('d')->orderBy('d.name', 'ASC');
        $visible = $this->directory->visibleDepartmentIds();
        if ($visible !== null) {
            $qb->andWhere('d.id IN (:ids)')->setParameter('ids', $visible ?: [0]);
        }

        $counts = $this->em->createQuery('SELECT IDENTITY(u.department) AS dep, COUNT(u.id) AS n FROM ' . User::class . ' u WHERE u.department IS NOT NULL AND u.isActive = true GROUP BY u.department')
            ->getArrayResult();
        $byDep = array_column($counts, 'n', 'dep');

        $data = array_map(fn (Department $d) => $this->payload($d, (int) ($byDep[$d->getId()] ?? 0)), $qb->getQuery()->getResult());
        $unassigned = (int) $this->em->createQuery(
            'SELECT COUNT(u.id) FROM ' . User::class . ' u JOIN u.role r WHERE r.name IN (:roles) AND u.isActive = true AND u.department IS NULL'
        )->setParameter('roles', PermissionCatalog::EMPLOYEE_ROLES)->getSingleScalarResult();

        return $this->json(['data' => $data, 'unassigned' => $visible === null ? $unassigned : 0]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function show(int $id): JsonResponse
    {
        $department = $this->em->getRepository(Department::class)->find($id);
        if (!$department) {
            return $this->json(['error' => 'Service introuvable'], Response::HTTP_NOT_FOUND);
        }
        $members = $this->em->getRepository(User::class)->findBy(['department' => $department, 'isActive' => true], ['nom' => 'ASC', 'prenom' => 'ASC']);

        return $this->json($this->payload($department, count($members)) + [
            'members' => array_map(static fn (User $u) => AgentDirectory::userPayload($u), $members),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Requête invalide'], Response::HTTP_BAD_REQUEST);
        }

        $department = new Department();
        if (($error = $this->apply($department, $data, true)) !== null) {
            return $error;
        }
        $this->em->persist($department);
        $this->em->flush();

        return $this->json($this->payload($department, 0), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $department = $this->em->getRepository(Department::class)->find($id);
        if (!$department) {
            return $this->json(['error' => 'Service introuvable'], Response::HTTP_NOT_FOUND);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Requête invalide'], Response::HTTP_BAD_REQUEST);
        }
        if (($error = $this->apply($department, $data, false)) !== null) {
            return $error;
        }
        $this->em->flush();

        return $this->json(['message' => 'Service mis à jour']);
    }

    /** Fixe la liste exacte des membres du service : les cases décochées sont retirées du service. */
    #[Route('/{id}/members', name: 'members', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function members(int $id, Request $request): JsonResponse
    {
        $department = $this->em->getRepository(Department::class)->find($id);
        $data = json_decode($request->getContent(), true);
        if (!$department) {
            return $this->json(['error' => 'Service introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!is_array($data) || !isset($data['userIds']) || !is_array($data['userIds'])) {
            return $this->json(['error' => 'userIds requis'], Response::HTTP_BAD_REQUEST);
        }

        $wanted = array_map('intval', $data['userIds']);
        $employees = $this->directory->employees(null, null, false);
        $known = array_map(static fn (User $u) => $u->getId(), $employees);
        if (array_diff($wanted, $known)) {
            return $this->json(['error' => 'Certains utilisateurs ne sont pas des employés'], Response::HTTP_BAD_REQUEST);
        }

        foreach ($employees as $user) {
            if (in_array($user->getId(), $wanted, true)) {
                $user->setDepartment($department);
            } elseif ($user->getDepartment()?->getId() === $department->getId()) {
                $user->setDepartment(null);
            }
        }
        $this->em->flush();

        return $this->json(['message' => 'Membres du service mis à jour', 'count' => count($wanted)]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_RH_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $department = $this->em->getRepository(Department::class)->find($id);
        if (!$department) {
            return $this->json(['error' => 'Service introuvable'], Response::HTTP_NOT_FOUND);
        }
        if ($this->em->getRepository(User::class)->count(['department' => $department]) > 0) {
            return $this->json(['error' => 'Ce service contient encore des agents. Retirez-les ou rattachez-les à un autre service avant de le supprimer.'], Response::HTTP_CONFLICT);
        }
        $this->em->remove($department);
        $this->em->flush();

        return $this->json(['message' => 'Service supprimé']);
    }

    private function apply(Department $department, array $data, bool $creating): ?JsonResponse
    {
        if ($creating || array_key_exists('name', $data)) {
            $name = trim((string) ($data['name'] ?? ''));
            if ($name === '' || mb_strlen($name) > 100) {
                return $this->json(['error' => 'Le nom du service est obligatoire (100 caractères maximum)'], Response::HTTP_BAD_REQUEST);
            }
            $existing = $this->em->getRepository(Department::class)->findOneBy(['name' => $name]);
            if ($existing && $existing->getId() !== $department->getId()) {
                return $this->json(['error' => 'Un service porte déjà ce nom'], Response::HTTP_CONFLICT);
            }
            $department->setName($name);
        }

        if (array_key_exists('headId', $data)) {
            if ($data['headId'] === null || $data['headId'] === '') {
                $department->setHead(null);
            } else {
                $head = $this->em->getRepository(User::class)->find((int) $data['headId']);
                if (!$head || !$head->isActive() || $head->getRole()?->getName() !== PermissionCatalog::ROLE_SUPERVISOR) {
                    return $this->json(['error' => 'Le chef de service doit être un compte actif ayant le rôle « Supérieur hiérarchique »'], Response::HTTP_BAD_REQUEST);
                }
                $department->setHead($head);
            }
        }

        return null;
    }

    private function payload(Department $d, int $agentsCount): array
    {
        $head = $d->getHead();

        return [
            'id' => $d->getId(),
            'name' => $d->getName(),
            'head' => $head ? ['id' => $head->getId(), 'matricule' => $head->getMatricule(), 'nom' => $head->getNom(), 'prenom' => $head->getPrenom()] : null,
            'agentsCount' => $agentsCount,
        ];
    }
}
