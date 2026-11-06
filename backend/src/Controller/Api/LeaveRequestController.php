<?php

namespace App\Controller\Api;

use App\Entity\LeaveRequest;
use App\Entity\User;
use App\Repository\LeaveRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/leaves', name: 'api_leaves_')]
class LeaveRequestController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager, private LeaveRequestRepository $leaveRepo) {}

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_PERMISSION_REQUEST_LEAVE')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->getUser();

        if (!isset($data['startDate']) || !isset($data['endDate'])) {
            return $this->json(['error' => 'startDate et endDate requis'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $start = new \DateTime($data['startDate']);
            $end = new \DateTime($data['endDate']);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Format de date invalide'], Response::HTTP_BAD_REQUEST);
        }

        if ($start > $end) {
            return $this->json(['error' => 'startDate doit être antérieur ou égal à endDate'], Response::HTTP_BAD_REQUEST);
        }

        if ($end < new \DateTime('today')) {
            return $this->json(['error' => 'La période demandée est déjà passée'], Response::HTTP_BAD_REQUEST);
        }

        $reason = isset($data['reason']) ? trim((string) $data['reason']) : null;
        if ($reason !== null && mb_strlen($reason) > 255) {
            return $this->json(['error' => 'Le motif ne doit pas dépasser 255 caractères'], Response::HTTP_BAD_REQUEST);
        }

        // Pas de chevauchement avec une autre demande en attente ou approuvée.
        $overlap = $this->leaveRepo->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.user = :user')
            ->andWhere('l.status IN (:statuses)')
            ->andWhere('l.startDate <= :end')
            ->andWhere('l.endDate >= :start')
            ->setParameter('user', $user)
            ->setParameter('statuses', ['PENDING', 'APPROVED'])
            ->setParameter('start', $start->format('Y-m-d'))
            ->setParameter('end', $end->format('Y-m-d'))
            ->getQuery()
            ->getSingleScalarResult();

        if ((int) $overlap > 0) {
            return $this->json(['error' => 'Une demande existe déjà sur cette période'], Response::HTTP_CONFLICT);
        }

        $leave = new LeaveRequest();
        $leave->setUser($user);
        $leave->setStartDate($start);
        $leave->setEndDate($end);
        $leave->setReason($reason !== '' ? $reason : null);
        $leave->setStatus('PENDING');

        $this->entityManager->persist($leave);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande de congé créée', 'data' => ['id' => $leave->getId(), 'status' => $leave->getStatus()]], Response::HTTP_CREATED);
    }

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(new Expression('is_granted("ROLE_PERMISSION_VIEW_OWN_LEAVES") or is_granted("ROLE_PERMISSION_MANAGE_LEAVES")'))]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();

        // RH ou Super Admin peuvent voir toutes les demandes
        if ($this->isGranted('ROLE_PERMISSION_MANAGE_LEAVES')) {
            $leaves = $this->entityManager->getRepository(LeaveRequest::class)->findBy([], ['createdAt' => 'DESC']);
        } else {
            // Sinon seulement les siennes
            $leaves = $this->entityManager->getRepository(LeaveRequest::class)->findBy(['user' => $user], ['createdAt' => 'DESC']);
        }

        $data = [];
        foreach ($leaves as $l) {
            $userEntity = $l->getUser();
            $approvedBy = $l->getApprovedBy();

            $data[] = [
                'id' => $l->getId(),
                'user' => $userEntity?->getMatricule(),
                'userName' => $userEntity ? trim(($userEntity->getPrenom() ?? '') . ' ' . ($userEntity->getNom() ?? '')) : null,
                'startDate' => $l->getStartDate()->format('Y-m-d'),
                'endDate' => $l->getEndDate()->format('Y-m-d'),
                'reason' => $l->getReason(),
                'status' => $l->getStatus(),
                'approvedBy' => $approvedBy?->getMatricule(),
                'approvedByName' => $approvedBy ? trim(($approvedBy->getPrenom() ?? '') . ' ' . ($approvedBy->getNom() ?? '')) : null,
                'approvedAt' => $l->getApprovedAt()?->format('Y-m-d H:i:s'),
                'createdAt' => $l->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json(['success' => true, 'data' => $data]);
    }

    #[Route('/{id}/approve', name: 'approve', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_PERMISSION_MANAGE_LEAVES')]
    public function approve(int $id): JsonResponse
    {
        $leave = $this->entityManager->getRepository(LeaveRequest::class)->find($id);
        if (!$leave) {
            return $this->json(['error' => 'Demande non trouvée'], Response::HTTP_NOT_FOUND);
        }

        if ($leave->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Cette demande a déjà été traitée'], Response::HTTP_CONFLICT);
        }

        $leave->setStatus('APPROVED');
        $leave->setApprovedBy($this->getUser());
        $leave->setApprovedAt(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande approuvée']);
    }

    #[Route('/{id}/reject', name: 'reject', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_PERMISSION_MANAGE_LEAVES')]
    public function reject(int $id, Request $request): JsonResponse
    {
        $leave = $this->entityManager->getRepository(LeaveRequest::class)->find($id);
        if (!$leave) {
            return $this->json(['error' => 'Demande non trouvée'], Response::HTTP_NOT_FOUND);
        }

        if ($leave->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Cette demande a déjà été traitée'], Response::HTTP_CONFLICT);
        }

        $leave->setStatus('REJECTED');
        $leave->setApprovedBy($this->getUser());
        $leave->setApprovedAt(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande rejetée']);
    }

    #[Route('/{id}/cancel', name: 'cancel', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_PERMISSION_REQUEST_LEAVE')]
    public function cancel(int $id): JsonResponse
    {
        $leave = $this->leaveRepo->find($id);

        if (!$leave || $leave->getUser()?->getId() !== $this->getUser()?->getId()) {
            return $this->json(['error' => 'Demande non trouvée'], Response::HTTP_NOT_FOUND);
        }

        if ($leave->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Seule une demande en attente peut être annulée'], Response::HTTP_CONFLICT);
        }

        $leave->setStatus('CANCELLED');
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande annulée']);
    }
}
