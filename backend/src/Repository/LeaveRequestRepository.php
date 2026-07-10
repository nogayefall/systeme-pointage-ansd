<?php

namespace App\Repository;

use App\Entity\LeaveRequest;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<LeaveRequest>
 */
class LeaveRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LeaveRequest::class);
    }

    public function hasApprovedLeaveOnDate(User $user, \DateTimeInterface $date): bool
    {
        $qb = $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.user = :user')
            ->andWhere('l.status = :status')
            ->andWhere('l.startDate <= :date')
            ->andWhere('l.endDate >= :date')
            ->setParameter('user', $user)
            ->setParameter('status', 'APPROVED')
            ->setParameter('date', $date->format('Y-m-d'));

        return (int)$qb->getQuery()->getSingleScalarResult() > 0;
    }

    public function countApprovedDaysBetween(User $user, \DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $qb = $this->createQueryBuilder('l')
            ->where('l.user = :user')
            ->andWhere('l.status = :status')
            ->andWhere('l.startDate <= :end')
            ->andWhere('l.endDate >= :start')
            ->setParameter('user', $user)
            ->setParameter('status', 'APPROVED')
            ->setParameter('start', $start->format('Y-m-d'))
            ->setParameter('end', $end->format('Y-m-d'));

        $leaves = $qb->getQuery()->getResult();

        $days = 0;
        foreach ($leaves as $leave) {
            $s = max($start->format('Y-m-d'), $leave->getStartDate()->format('Y-m-d'));
            $e = min($end->format('Y-m-d'), $leave->getEndDate()->format('Y-m-d'));
            $ds = new \DateTime($s);
            $de = new \DateTime($e);
            $days += (int)$de->diff($ds)->format('%a') + 1;
        }

        return $days;
    }
}
