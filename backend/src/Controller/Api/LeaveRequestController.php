<?php

namespace App\Controller\Api;

use App\Entity\LeaveRequest;
use App\Entity\User;
use App\Repository\LeaveRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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
    #[IsGranted('ROLE_AGENT')]
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

        $leave = new LeaveRequest();
        $leave->setUser($user);
        $leave->setStartDate($start);
        $leave->setEndDate($end);
        $leave->setReason($data['reason'] ?? null);
        $leave->setStatus('PENDING');

        $this->entityManager->persist($leave);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande de congé créée', 'data' => ['id' => $leave->getId(), 'status' => $leave->getStatus()]], Response::HTTP_CREATED);
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();

        // RH ou Super Admin peuvent voir toutes les demandes
        if ($this->isGranted('ROLE_RH_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN')) {
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
            ];
        }

        return $this->json(['success' => true, 'data' => $data]);
    }

    #[Route('/{id}/approve', name: 'approve', methods: ['POST'])]
    public function approve(int $id): JsonResponse
    {
        // allow both RH admins and Super Admins to approve
        if (!($this->isGranted('ROLE_RH_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN'))) {
            return $this->json(['error' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $leave = $this->entityManager->getRepository(LeaveRequest::class)->find($id);
        if (!$leave) {
            return $this->json(['error' => 'Demande non trouvée'], Response::HTTP_NOT_FOUND);
        }

        $leave->setStatus('APPROVED');
        $leave->setApprovedBy($this->getUser());
        $leave->setApprovedAt(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande approuvée']);
    }

    #[Route('/{id}/reject', name: 'reject', methods: ['POST'])]
    public function reject(int $id, Request $request): JsonResponse
    {
        // allow both RH admins and Super Admins to reject
        if (!($this->isGranted('ROLE_RH_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN'))) {
            return $this->json(['error' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $leave = $this->entityManager->getRepository(LeaveRequest::class)->find($id);
        if (!$leave) {
            return $this->json(['error' => 'Demande non trouvée'], Response::HTTP_NOT_FOUND);
        }

        $leave->setStatus('REJECTED');
        $leave->setApprovedBy($this->getUser());
        $leave->setApprovedAt(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Demande rejetée']);
    }
}
