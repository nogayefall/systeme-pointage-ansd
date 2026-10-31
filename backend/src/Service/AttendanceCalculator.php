<?php

namespace App\Service;

use App\Entity\LeaveRequest;
use App\Entity\Pointage;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Calcule, pour chaque employé et chaque jour, le statut et les heures travaillées.
 *
 * Statuts d'un jour ouvré :
 *   PRESENT : a pointé, à l'heure       LATE : première arrivée après 08:00
 *   LEAVE   : congé approuvé couvrant ce jour (n'est PAS une absence)
 *   ABSENT  : aucun pointage et aucun congé approuvé
 * Un week-end ou un jour férié n'a de ligne que si l'employé a pointé (heures supplémentaires).
 *
 * Trois requêtes quel que soit le nombre d'employés ou de jours.
 */
class AttendanceCalculator
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    /**
     * @param list<User> $agents
     * @return array<int, array{agent: User, days: list<array<string, mixed>>, totals: array<string, mixed>}>
     */
    public function compute(array $agents, \DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $today = new \DateTimeImmutable('today');
        $startDay = \DateTimeImmutable::createFromInterface($start)->setTime(0, 0);
        $endDay = min(\DateTimeImmutable::createFromInterface($end)->setTime(0, 0), $today);

        $result = [];
        foreach ($agents as $agent) {
            $result[$agent->getId()] = ['agent' => $agent, 'days' => [], 'totals' => $this->emptyTotals()];
        }
        if (!$agents || $startDay > $endDay) {
            return $result;
        }

        $events = $this->loadEvents($agents, $startDay, $endDay);
        $leaveDays = $this->loadLeaveDays($agents, $startDay, $endDay);

        foreach ($agents as $agent) {
            $id = $agent->getId();
            // Un employé arrivé après le début de la période n'est pas « absent » avant son arrivée.
            $from = max($startDay, \DateTimeImmutable::createFromInterface($agent->getCreatedAt())->setTime(0, 0));

            for ($d = $from; $d <= $endDay; $d = $d->modify('+1 day')) {
                $key = $d->format('Y-m-d');
                $dayEvents = $events[$id][$key] ?? [];
                $summary = WorkSchedule::summarizeDay($d, $dayEvents);
                $present = $summary['first'] !== null || $summary['last'] !== null;

                if ($present) {
                    $status = $summary['late'] ? 'LATE' : 'PRESENT';
                } elseif (!$summary['working']) {
                    continue; // week-end / férié sans pointage : rien à signaler
                } elseif (isset($leaveDays[$id][$key])) {
                    $status = 'LEAVE';
                } else {
                    $status = 'ABSENT';
                }

                $anomaly = null;
                if ($d < $today) {
                    $anomaly = $summary['incomplete'] ? 'MISSING_EXIT' : ($summary['missingEntry'] ? 'MISSING_ENTRY' : null);
                }

                $result[$id]['days'][] = [
                    'date' => $key,
                    'status' => $status,
                    'working' => $summary['working'],
                    'first' => $summary['first']?->format('Y-m-d H:i:s'),
                    'last' => $summary['last']?->format('Y-m-d H:i:s'),
                    'building' => $dayEvents ? $dayEvents[0]['building'] : null,
                    'workedMinutes' => $summary['workedMinutes'],
                    'normalMinutes' => $summary['normalMinutes'],
                    'overtimeMinutes' => $summary['overtimeMinutes'],
                    'incomplete' => $summary['incomplete'],
                    'anomaly' => $anomaly,
                ];
            }

            $result[$id]['totals'] = $this->totals($result[$id]['days']);
        }

        return $result;
    }

    /** @param list<array<string, mixed>> $days */
    private function totals(array $days): array
    {
        $t = $this->emptyTotals();
        $workingDays = 0;
        foreach ($days as $day) {
            $t['workedMinutes'] += $day['workedMinutes'];
            $t['normalMinutes'] += $day['normalMinutes'];
            $t['overtimeMinutes'] += $day['overtimeMinutes'];
            if ($day['anomaly']) {
                $t['anomalies']++;
            }
            if ($day['working']) {
                $workingDays++;
            }
            switch ($day['status']) {
                case 'PRESENT':
                case 'LATE':
                    if ($day['working']) {
                        $t['daysWorked']++;
                    }
                    if ($day['status'] === 'LATE') {
                        $t['daysLate']++;
                    }
                    break;
                case 'LEAVE':
                    $t['daysLeave']++;
                    break;
                case 'ABSENT':
                    $t['daysAbsent']++;
                    break;
            }
        }
        $t['daysExpected'] = $workingDays - $t['daysLeave'];
        // Les jours de congé sortent du calcul : un agent en congé n'abaisse pas son assiduité.
        $t['attendanceRate'] = $t['daysExpected'] > 0 ? round(100 * $t['daysWorked'] / $t['daysExpected'], 1) : null;

        return $t;
    }

    private function emptyTotals(): array
    {
        return [
            'daysExpected' => 0, 'daysWorked' => 0, 'daysLate' => 0, 'daysAbsent' => 0, 'daysLeave' => 0,
            'workedMinutes' => 0, 'normalMinutes' => 0, 'overtimeMinutes' => 0, 'anomalies' => 0, 'attendanceRate' => null,
        ];
    }

    /** @return array<int, array<string, list<array{type: string, at: \DateTimeImmutable, building: string}>>> */
    private function loadEvents(array $agents, \DateTimeImmutable $start, \DateTimeImmutable $end): array
    {
        $rows = $this->em->createQueryBuilder()
            ->select('p')
            ->from(Pointage::class, 'p')
            ->where('p.agent IN (:agents)')
            ->andWhere('p.dateTime >= :start')
            ->andWhere('p.dateTime <= :end')
            ->setParameter('agents', $agents)
            ->setParameter('start', $start)
            ->setParameter('end', $end->setTime(23, 59, 59))
            ->orderBy('p.dateTime', 'ASC')
            ->getQuery()
            ->getResult();

        $events = [];
        foreach ($rows as $p) {
            $events[$p->getAgent()->getId()][$p->getDateTime()->format('Y-m-d')][] = [
                'type' => $p->getType(),
                'at' => $p->getDateTime(),
                'building' => $p->getBuilding(),
            ];
        }

        return $events;
    }

    /** @return array<int, array<string, true>> */
    private function loadLeaveDays(array $agents, \DateTimeImmutable $start, \DateTimeImmutable $end): array
    {
        $leaves = $this->em->createQueryBuilder()
            ->select('l')
            ->from(LeaveRequest::class, 'l')
            ->where('l.user IN (:agents)')
            ->andWhere('l.status = :status')
            ->andWhere('l.startDate <= :end')
            ->andWhere('l.endDate >= :start')
            ->setParameter('agents', $agents)
            ->setParameter('status', 'APPROVED')
            ->setParameter('start', $start->format('Y-m-d'))
            ->setParameter('end', $end->format('Y-m-d'))
            ->getQuery()
            ->getResult();

        $days = [];
        foreach ($leaves as $leave) {
            $from = max($start, \DateTimeImmutable::createFromInterface($leave->getStartDate())->setTime(0, 0));
            $to = min($end, \DateTimeImmutable::createFromInterface($leave->getEndDate())->setTime(0, 0));
            for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
                if (WorkSchedule::isWorkingDay($d)) {
                    $days[$leave->getUser()->getId()][$d->format('Y-m-d')] = true;
                }
            }
        }

        return $days;
    }
}
