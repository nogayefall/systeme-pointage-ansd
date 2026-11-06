import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useFetch from '../../hooks/useFetch';
import { leavesApi, pointagesApi } from '../../services/api';
import { Async, Badge, Card, DataTable, EmptyState, PageHeader, StatCard } from '../../components/ui';
import {
  BUILDING_LABEL, DAY_STATUS, LEAVE_STATUS, formatDate, formatDuration, formatLongDate, formatTime, plural, todayIso, workingDays,
} from '../../utils/formatters';
import '../admin/admin.css';

export default function AgentHomePage() {
  const { user } = useAuth();
  const state = useFetch(async () => {
    const [month, leaves] = await Promise.all([pointagesApi.myDays(todayIso().slice(0, 7)), leavesApi.list()]);
    return { days: month.days || [], totals: month.totals, leaves: leaves.data || [] };
  }, []);

  return (
    <>
      <PageHeader variant="plain" title={`Bonjour ${user.prenom}`} subtitle={`${formatLongDate(todayIso())}${user.department ? ` · ${user.department}` : ''}`} />
      <Async state={state}>
        {({ days, totals, leaves }) => {
          const today = days.find((d) => d.date === todayIso());
          const upcoming = leaves.filter((l) => ['PENDING', 'APPROVED'].includes(l.status) && l.endDate >= todayIso());
          return (
            <div className="stack">
              <div className="kpi-grid kpi-grid-5">
                <StatCard icon="clock" tone={today?.first ? (today.status === 'LATE' ? 'warning' : 'success') : 'neutral'} label="Aujourd'hui"
                  value={today?.first ? formatTime(today.first) : '—'}
                  hint={today?.first ? (today.last ? `Parti à ${formatTime(today.last)}` : `Arrivée${today.status === 'LATE' ? ' en retard' : ' à l’heure'}`) : 'Pas encore pointé'} />
                <StatCard icon="check" tone="success" label="Jours travaillés (mois)" value={`${totals.daysWorked} / ${totals.daysExpected}`} />
                <StatCard icon="plus" tone="warning" label="Heures sup. (mois)" value={formatDuration(totals.overtimeMinutes)} />
                <StatCard icon="alert" tone="warning" label="Retards (mois)" value={totals.daysLate} />
                <StatCard icon="calendar" label="Congés à venir" value={upcoming.length} hint={upcoming[0] ? `Prochain : ${formatDate(upcoming[0].startDate)}` : 'Aucun'} />
              </div>

              <Card title="Mes derniers jours" padded={false} actions={<Link to="/agent/pointages">Tout le détail</Link>}>
                <DataTable paginate={false} dense rowKey="date" rows={days.slice(0, 6)} empty={<EmptyState icon="clock" title="Aucun pointage ce mois-ci" />}
                  columns={[
                    { key: 'd', header: 'Jour', render: (d) => formatDate(d.date, { weekday: 'short', day: '2-digit', month: 'short' }) },
                    { key: 'in', header: 'Arrivée', className: 'num', render: (d) => (d.first ? formatTime(d.first) : '—') },
                    { key: 'out', header: 'Départ', className: 'num', render: (d) => (d.last ? formatTime(d.last) : '—') },
                    { key: 'b', header: 'Bâtiment', render: (d) => BUILDING_LABEL[d.building] || '—' },
                    { key: 's', header: 'Statut', render: (d) => <Badge tone={DAY_STATUS[d.status]?.tone}>{DAY_STATUS[d.status]?.label}</Badge> },
                  ]} />
              </Card>

              <Card title="Mes demandes de congé" padded={false} actions={<Link to="/agent/conges">Gérer</Link>}>
                <DataTable paginate={false} dense rowKey="id" rows={leaves.slice(0, 4)} empty={<EmptyState icon="calendar" title="Aucune demande" />}
                  columns={[
                    { key: 'p', header: 'Période', render: (l) => `${formatDate(l.startDate)} → ${formatDate(l.endDate)}` },
                    { key: 'd', header: 'Durée', render: (l) => plural(workingDays(l.startDate, l.endDate), 'jour ouvré', 'jours ouvrés') },
                    { key: 's', header: 'Statut', render: (l) => <Badge tone={LEAVE_STATUS[l.status]?.tone}>{LEAVE_STATUS[l.status]?.label}</Badge> },
                  ]} />
              </Card>
            </div>
          );
        }}
      </Async>
    </>
  );
}
