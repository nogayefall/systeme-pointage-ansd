<?php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AuthService
{
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher,
        private EntityManagerInterface $entityManager
    ) {}

    public function createSuperAdmin(
        string $email,
        string $password,
        string $matricule,
        string $nom,
        string $prenom
    ): User {
        $user = new User();
        $user->setEmail($email);
        $user->setMatricule($matricule);
        $user->setNom($nom);
        $user->setPrenom($prenom);
        $user->setIsActive(true);

        // Hasher le mot de passe
        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        // Obtenir ou créer le rôle Super Admin
        $roleRepo = $this->entityManager->getRepository(\App\Entity\Role::class);
        $role = $roleRepo->findByName('Super Administrateur');
        
        if (!$role) {
            $role = new \App\Entity\Role();
            $role->setName('Super Administrateur');
            $role->setDescription('Super administrateur avec accès total au système');
            $this->entityManager->persist($role);
        }

        $user->setRole($role);
        $user->setRoles(['ROLE_SUPER_ADMIN']);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    public function authenticate(string $email, string $password): ?User
    {
        $userRepo = $this->entityManager->getRepository(User::class);
        $user = $userRepo->findByEmail($email);

        if (!$user) {
            return null;
        }

        if (!$this->passwordHasher->isPasswordValid($user, $password)) {
            return null;
        }

        if (!$user->isActive()) {
            return null;
        }

        return $user;
    }

    public function authenticateByMatricule(string $matricule, string $password): ?User
    {
        $userRepo = $this->entityManager->getRepository(User::class);
        $user = $userRepo->findOneBy(['matricule' => $matricule]);

        if (!$user) {
            return null;
        }

        if (!$this->passwordHasher->isPasswordValid($user, $password)) {
            return null;
        }

        if (!$user->isActive()) {
            return null;
        }

        return $user;
    }
}
