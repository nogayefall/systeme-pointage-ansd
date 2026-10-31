<?php

namespace App\Service;

/**
 * Règles de temps de travail de l'ANSD (cahier des charges), définies à un seul endroit.
 *
 *  - Lundi à jeudi : 8h00 – 17h00, pause 13h30 – 14h30 (1 h)
 *  - Vendredi      : 8h00 – 17h30, pause 13h30 – 15h00 (1 h 30)
 *  - Journée normale = 8 h de travail effectif (la pause est déduite automatiquement).
 *  - Au-delà de 8 h : heures supplémentaires. Week-ends et jours fériés : tout est en heures sup.
 *  - Retard : première arrivée de la journée après 08:00.
 */
final class WorkSchedule
{
    public const START = '08:00';
    public const BREAK_START = '13:30';
    public const NORMAL_MINUTES = 480;

    /**
     * Jours fériés à date fixe (mois-jour). Les fêtes mobiles (Tabaski, Korité, Tamkharit, Pâques…)
     * changent chaque année : elles ne sont pas incluses et sont à ajouter par la DRH le moment venu.
     */
    public const FIXED_HOLIDAYS = ['01-01', '04-04', '05-01', '08-15', '11-01', '12-25'];

    public static function isHoliday(\DateTimeInterface $day): bool
    {
        return in_array($day->format('m-d'), self::FIXED_HOLIDAYS, true);
    }

    /** Jour ouvré = du lundi au vendredi, hors jour férié. */
    public static function isWorkingDay(\DateTimeInterface $day): bool
    {
        return (int) $day->format('N') <= 5 && !self::isHoliday($day);
    }

    public static function isFriday(\DateTimeInterface $day): bool
    {
        return (int) $day->format('N') === 5;
    }

    public static function endTime(\DateTimeInterface $day): string
    {
        return self::isFriday($day) ? '17:30' : '17:00';
    }

    public static function breakEnd(\DateTimeInterface $day): string
    {
        return self::isFriday($day) ? '15:00' : '14:30';
    }

    public static function breakMinutes(\DateTimeInterface $day): int
    {
        return self::isFriday($day) ? 90 : 60;
    }

    /** Une arrivée est un retard si elle a lieu après l'heure de début. */
    public static function isLate(\DateTimeInterface $firstEntry): bool
    {
        return $firstEntry->format('H:i') > self::START;
    }

    /** Nombre de jours ouvrés entre deux dates, bornes incluses. */
    public static function workingDaysBetween(\DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $count = 0;
        $day = \DateTimeImmutable::createFromInterface($start)->setTime(0, 0);
        $last = \DateTimeImmutable::createFromInterface($end)->setTime(0, 0);

        while ($day <= $last) {
            if (self::isWorkingDay($day)) {
                $count++;
            }
            $day = $day->modify('+1 day');
        }

        return $count;
    }

    /**
     * Première entrée de chaque jour, par agent.
     *
     * @param iterable<\App\Entity\Pointage> $pointages
     * @return array<string, \DateTimeImmutable> clé "agentId|Y-m-d" => heure de la première entrée
     */
    public static function firstEntries(iterable $pointages): array
    {
        $first = [];
        foreach ($pointages as $pointage) {
            if ($pointage->getType() !== 'ENTRY') {
                continue;
            }
            $key = $pointage->getAgent()->getId() . '|' . $pointage->getDateTime()->format('Y-m-d');
            if (!isset($first[$key]) || $pointage->getDateTime() < $first[$key]) {
                $first[$key] = $pointage->getDateTime();
            }
        }

        return $first;
    }

    /**
     * Résume une journée d'un agent à partir de ses pointages.
     *
     * Les arrivées/départs sont appariés dans l'ordre (arrivée → départ). Le temps de pause
     * est retiré de chaque période travaillée (seule la partie qui chevauche la pause est déduite :
     * un agent parti à 13h n'est pas pénalisé).
     *
     * @param list<array{type: string, at: \DateTimeInterface}> $events
     * @return array{first: ?\DateTimeImmutable, last: ?\DateTimeImmutable, workedMinutes: int, normalMinutes: int,
     *               overtimeMinutes: int, incomplete: bool, missingEntry: bool, late: bool, working: bool}
     */
    public static function summarizeDay(\DateTimeInterface $day, array $events): array
    {
        usort($events, static fn ($a, $b) => $a['at'] <=> $b['at']);

        $dayStr = $day->format('Y-m-d');
        $breakStart = new \DateTimeImmutable($dayStr . ' ' . self::BREAK_START);
        $breakEnd = new \DateTimeImmutable($dayStr . ' ' . self::breakEnd($day));

        $first = null;
        $last = null;
        $open = null;
        $seconds = 0;
        $missingEntry = false;

        foreach ($events as $event) {
            $at = \DateTimeImmutable::createFromInterface($event['at']);
            if ($event['type'] === 'ENTRY') {
                $first ??= $at;
                $open ??= $at;
            } elseif ($open !== null) {
                $seconds += max(0, $at->getTimestamp() - $open->getTimestamp());
                $overlapStart = max($open->getTimestamp(), $breakStart->getTimestamp());
                $overlapEnd = min($at->getTimestamp(), $breakEnd->getTimestamp());
                $seconds -= max(0, $overlapEnd - $overlapStart);
                $last = $at;
                $open = null;
            } else {
                $missingEntry = true; // départ sans arrivée
                $last = $at;
            }
        }

        $worked = (int) round($seconds / 60);
        $working = self::isWorkingDay($day);
        $overtime = $working ? max(0, $worked - self::NORMAL_MINUTES) : $worked;

        return [
            'first' => $first,
            'last' => $last,
            'workedMinutes' => $worked,
            'normalMinutes' => $worked - $overtime,
            'overtimeMinutes' => $overtime,
            'incomplete' => $open !== null,
            'missingEntry' => $missingEntry,
            'late' => $working && $first !== null && self::isLate($first),
            'working' => $working,
        ];
    }
}
