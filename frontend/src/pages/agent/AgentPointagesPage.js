import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { pointagesApi } from '../../services/api';
import { Async, Badge, Button, Card, DataTable, EmptyState, PageHeader, StatCard } from '../../components/ui';
import { BUILDING_LABEL, DAY_STATUS, formatDuration, formatLongDate, formatTime } from '../../utils/formatters';
import '../admin/admin.css';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function AgentPointagesPage() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const state = useFetch(() => pointagesApi.myDays(month), [month]);
  const shift = (delta) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)));
  };
  const isCurrent = month === monthKey(new Date());

  const columns = [
    { key: 'date', header: 'Jour', render: (d) => formatLongDate(d.date) },
    { key: 'in', header: 'Arrivée', className: 'num', render: (d) => (d.first ? formatTime(d.first) : '—') },
    { key: 'out', header: 'Départ', className: 'num', render: (d) => (d.last ? formatTime(d.last) : (d.incomplete ? <Badge tone="warning">Non pointé</Badge> : '—')) },
    { key: 'building', header: 'Bâtiment', render: (d) => BUILDING_LABEL[d.building] || '—' },
    { key: 'normal', header: 'H. normales', className: 'num', render: (d) => (d.first ? formatDuration(d.normalMinutes) : '—') },
    { key: 'ot', header: 'H. sup.', className: 'num', render: (d) => (d.overtimeMinutes ? formatDuration(d.overtimeMinutes) : '—') },
    { key: 'st', header: 'Statut', render: (d) => (
      <Badge tone={DAY_STATUS[d.status]?.tone}>{DAY_STATUS[d.status]?.label}{!d.working && d.first ? ' · jour non ouvré' : ''}</Badge>
    ) },
  ];

  return (
    <>
      <PageHeader title="Mes pointages" subtitle="Votre décompte jour par jour : heures normales et heures supplémentaires"
        actions={(
          <>
            <Button icon="chevronLeft" onClick={() => shift(-1)} aria-label="Mois précédent" />
            <strong style={{ alignSelf: 'center', minWidth: 150, textAlign: 'center' }}>{monthLabel(month)}</strong>
            <Button icon="chevronRight" onClick={() => shift(1)} disabled={isCurrent} aria-label="Mois suivant" />
          </>
        )} />
      <Async state={state}>
        {({ days, totals }) => (
          <div className="stack">
            <div className="kpi-grid kpi-grid-5">
              <StatCard icon="check" tone="success" label="Jours travaillés" value={`${totals.daysWorked} / ${totals.daysExpected}`} hint="jours ouvrés" />
              <StatCard icon="clock" label="Heures normales" value={formatDuration(totals.normalMinutes)} />
              <StatCard icon="plus" tone="warning" label="Heures supplémentaires" value={formatDuration(totals.overtimeMinutes)} />
              <StatCard icon="alert" tone="warning" label="Retards" value={totals.daysLate} />
              <StatCard icon="calendar" label="Congés" value={totals.daysLeave} hint={totals.daysAbsent ? `${totals.daysAbsent} absence(s)` : 'aucune absence'} />
            </div>
            <Card padded={false}>
              <DataTable columns={columns} rows={days} rowKey="date" empty={<EmptyState icon="clock" title="Aucun pointage ce mois-ci" />} />
            </Card>
          </div>
        )}
      </Async>
    </>
  );
}
