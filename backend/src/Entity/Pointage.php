<?php

namespace App\Entity;

use App\Repository\PointageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PointageRepository::class)]
#[ORM\Index(name: 'idx_pointage_datetime', columns: ['date_time'])]
class Pointage
{
    public const BUILDING_SIEGE = 'SIEGE';
    public const BUILDING_ANNEXE = 'ANNEXE';
    public const BUILDINGS = [self::BUILDING_SIEGE, self::BUILDING_ANNEXE];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agentSecurity = null;

    #[ORM\Column(length: 20)]
    private ?string $type = null; // 'ENTRY' (arrivée) ou 'EXIT' (départ)

    #[ORM\Column]
    private ?\DateTimeImmutable $dateTime = null;

    #[ORM\Column(length: 20)]
    private ?string $method = null; // 'BARCODE' (lecteur de code-barres) ou 'MANUAL'

    /** Bâtiment où le pointage a été enregistré. */
    #[ORM\Column(length: 10, options: ['default' => 'SIEGE'])]
    private string $building = self::BUILDING_SIEGE;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $notes = null;

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

    public function getAgent(): ?User
    {
        return $this->agent;
    }

    public function setAgent(?User $agent): static
    {
        $this->agent = $agent;

        return $this;
    }

    public function getAgentSecurity(): ?User
    {
        return $this->agentSecurity;
    }

    public function setAgentSecurity(?User $agentSecurity): static
    {
        $this->agentSecurity = $agentSecurity;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getDateTime(): ?\DateTimeImmutable
    {
        return $this->dateTime;
    }

    public function setDateTime(\DateTimeImmutable $dateTime): static
    {
        $this->dateTime = $dateTime;

        return $this;
    }

    public function getMethod(): ?string
    {
        return $this->method;
    }

    public function setMethod(string $method): static
    {
        $this->method = $method;

        return $this;
    }

    public function getBuilding(): string
    {
        return $this->building;
    }

    public function setBuilding(string $building): static
    {
        $this->building = $building;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

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
