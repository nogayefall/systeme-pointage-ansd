<?php

namespace App\Entity;

use App\Repository\BadgeCodeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BadgeCodeRepository::class)]
#[ORM\Table(name: 'badge_code')]
#[ORM\Index(name: 'idx_badge_code', columns: ['badge_code'])]
class BadgeCode
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * Le code EXACT envoyé par le lecteur barcode
     * Ex: "!%@%" ou "ABC123" ou n'importe quel format du lecteur
     */
    #[ORM\Column(length: 50)]
    private ?string $badgeCode = null;

    /**
     * L'agent associé à ce badge
     */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBadgeCode(): ?string
    {
        return $this->badgeCode;
    }

    public function setBadgeCode(string $badgeCode): static
    {
        $this->badgeCode = $badgeCode;
        return $this;
    }

    public function getAgent(): ?User
    {
        return $this->agent;
    }

    public function setAgent(?User $agent): static
    {
        $this->agent = $agent;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }
}
