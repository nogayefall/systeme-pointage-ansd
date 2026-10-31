<?php

namespace App\Service;

use App\Entity\Permission;
use App\Entity\Role;
use App\Security\PermissionCatalog;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Crée ou met à jour (de façon idempotente) les 4 rôles de base et leurs permissions
 * d'après PermissionCatalog. Les rôles et permissions ajoutés à la main sont conservés.
 */
class RoleBootstrapper
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    /**
     * @return array<string, Role> rôles de base indexés par leur nom
     */
    public function sync(): array
    {
        $permissionRepo = $this->em->getRepository(Permission::class);
        $roleRepo = $this->em->getRepository(Role::class);

        // 1. Permissions du catalogue
        /** @var array<string, Permission> $permissions */
        $permissions = [];
        foreach (PermissionCatalog::PERMISSIONS as $name => $description) {
            $permission = $permissionRepo->findOneBy(['name' => $name]) ?? (new Permission())->setName($name);
            // Sous MySQL la recherche est insensible à la casse : une ancienne permission
            // « EXPORT_REPORTS » est retrouvée et renommée au lieu d'être recréée.
            $permission->setName($name)->setDescription($description);
            $this->em->persist($permission);
            $permissions[$name] = $permission;
        }
        $this->em->flush();

        // 2. Rôles de base, avec exactement les permissions du catalogue
        $roles = [];
        foreach (PermissionCatalog::ROLES as $roleName => $definition) {
            $role = $roleRepo->findOneBy(['name' => $roleName]) ?? (new Role())->setName($roleName);
            $role->setDescription($definition['description']);

            foreach ($role->getPermissions()->toArray() as $existing) {
                $role->removePermission($existing);
            }
            foreach ($definition['permissions'] as $permissionName) {
                $role->addPermission($permissions[$permissionName]);
            }

            $this->em->persist($role);
            $roles[$roleName] = $role;
        }
        $this->em->flush();

        // 3. Suppression des anciens doublons (ils ne sont plus rattachés à aucun rôle de base)
        foreach (PermissionCatalog::LEGACY_PERMISSIONS as $legacyName) {
            $legacy = $permissionRepo->findOneBy(['name' => $legacyName]);
            // Sous MySQL la comparaison est insensible à la casse : on ne supprime
            // jamais une permission du catalogue.
            if ($legacy && !isset(PermissionCatalog::PERMISSIONS[$legacy->getName()])) {
                foreach ($roleRepo->findAll() as $role) {
                    $role->removePermission($legacy);
                }
                $this->em->remove($legacy);
            }
        }
        $this->em->flush();

        return $roles;
    }
}
