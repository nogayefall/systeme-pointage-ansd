<?php

namespace App\Service;

use App\Entity\User;
use App\Security\PermissionCatalog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Qui l'utilisateur connecté peut-il voir ?
 *
 *  - Administrateur RH / Super administrateur / agent de sécurité : tous les employés ;
 *  - Supérieur hiérarchique : uniquement les employés des services dont il est le chef.
 *
 * Toutes les statistiques, rapports et listes de pointages passent par ici : la règle est écrite une seule fois.
 */
class AgentDirectory
{
    public function __construct(
        private EntityManagerInterface $em,
        private Security $security,
    ) {
    }

    /** Vrai si la vue est limitée à l'équipe de l'utilisateur (supérieur hiérarchique sans droits RH). */
    public function isTeamScoped(): bool
    {
        return !$this->security->isGranted('ROLE_RH_ADMIN')
            && !$this->security->isGranted('ROLE_SECURITY_AGENT')
            && $this->security->isGranted('ROLE_SUPERVISOR');
    }

    /**
     * Employés (agents et supérieurs) visibles par l'utilisateur connecté.
     *
     * @param string|int|null $department identifiant du service, « none » pour les employés sans service
     * @return list<User>
     */
    public function employees(string|int|null $department = null, ?string $q = null, bool $activeOnly = true): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('u', 'd')
            ->from(User::class, 'u')
            ->join('u.role', 'r')
            ->leftJoin('u.department', 'd')
            ->where('r.name IN (:roles)')
            ->setParameter('roles', PermissionCatalog::EMPLOYEE_ROLES)
            ->orderBy('u.nom', 'ASC')
            ->addOrderBy('u.prenom', 'ASC');

        if ($activeOnly) {
            $qb->andWhere('u.isActive = true');
        }

        if ($this->isTeamScoped()) {
            $qb->andWhere('d.head = :me')->setParameter('me', $this->security->getUser());
        }

        if ($department === 'none') {
            $qb->andWhere('u.department IS NULL');
        } elseif ($department !== null && $department !== '' && ctype_digit((string) $department)) {
            $qb->andWhere('d.id = :dep')->setParameter('dep', (int) $department);
        }

        $q = trim((string) $q);
        if ($q !== '') {
            $qb->andWhere('u.nom LIKE :q OR u.prenom LIKE :q OR u.matricule LIKE :q')
                ->setParameter('q', '%' . addcslashes($q, '%_') . '%');
        }

        return $qb->getQuery()->getResult();
    }

    public function canSee(User $agent): bool
    {
        if (!$this->isTeamScoped()) {
            return true;
        }

        return $agent->getDepartment()?->getHead()?->getId() === $this->security->getUser()?->getId();
    }

    /** Identifiants des services visibles (null = tous). */
    public function visibleDepartmentIds(): ?array
    {
        if (!$this->isTeamScoped()) {
            return null;
        }

        return array_map(
            static fn ($d) => $d->getId(),
            $this->em->getRepository(\App\Entity\Department::class)->findBy(['head' => $this->security->getUser()])
        );
    }

    public static function userPayload(?User $u): ?array
    {
        if (!$u) {
            return null;
        }

        return [
            'id' => $u->getId(),
            'matricule' => $u->getMatricule(),
            'nom' => $u->getNom(),
            'prenom' => $u->getPrenom(),
            'department' => $u->getDepartment() ? ['id' => $u->getDepartment()->getId(), 'name' => $u->getDepartment()->getName()] : null,
        ];
    }
}
