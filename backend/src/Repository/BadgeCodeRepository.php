<?php

namespace App\Repository;

use App\Entity\BadgeCode;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BadgeCode>
 *
 * @method BadgeCode|null find($id, $lockMode = null, $lockVersion = null)
 * @method BadgeCode|null findOneBy(array $criteria, array $orderBy = null)
 * @method BadgeCode[]    findAll()
 * @method BadgeCode[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class BadgeCodeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BadgeCode::class);
    }

    public function findByBadgeCode(string $badgeCode): ?BadgeCode
    {
        return $this->findOneBy(['badgeCode' => $badgeCode]);
    }
}
