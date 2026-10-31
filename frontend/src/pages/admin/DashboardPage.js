import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useFetch from '../../hooks/useFetch';
import useInterval from '../../hooks/useInterval';
import useLeaveDecision from '../../hooks/useLeaveDecision';
import { leavesApi, pointagesApi, servicesApi, statsApi } from '../../services/api';
import {
  Async, Badge, Card, DataTable, EmptyState, PageHeader, PersonCell, Progress, Segmented, Select, StatCard,
} from '../../components/ui';
import { HourlyChart, TrendChart } from '../../components/charts/charts';
import LeaveActions from '../../components/LeaveActions';
import { isRh } from '../../utils/roles';
import {
  BUILDING_LABEL, TYPE_LABEL, addDays, formatDate, formatDuration, formatLongDate, formatTime, isLate, personFromName, plural,
  toIsoDate, todayIso, workingDays,
} from '../../utils/formatters';
import './admin.css';

const RANGES = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
];
const toneFor = (rate) => (rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger');

/**
 * Tableau de bord unique : situation du jour, évolution et assiduité par agent.
 * Pour la RH il couvre toute l'agence ; pour un supérieur hiérarchique, son équipe seulement.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const rh = isRh(user);
  const base = rh ? '/admin' : '/equipe';
  const [department, setDepartment] = useState('');
  const [days, setDays] = useState(30);
  const params = department ? { departmentId: department } : {};

  const services = useFetch(() => servicesApi.list(), []);

  // Situation du jour : se rafraîchit toute seule.
  const today = useFetch(async () => {
    const [summary, hourly, latest, leaves] = await Promise.all([
      statsApi.summary(params),
      statsApi.hourly(params),
      pointagesApi.today(params),
      rh ? leavesApi.list() : Promise.resolve({ data: [] }),
    ]);
    return {
      kpis: summary.kpis || {},
      hourly: hourly.data || [],
      latest: (latest.data || []).slice(0, 8),
      pending: (leaves.data || []).filter((l) => l.status === 'PENDING'),
    };
  }, [department]);
  useInterval(() => today.reload({ silent: true }), 30000);
  const decision = useLeaveDecision(() => today.reload({ silent: true }));

  // Évolution et assiduité : dépendent de la période choisie.
  const period = useFetch(async () => {
    const [trend, attendance] = await Promise.all([
      statsApi.trend({ ...params, days }),
      statsApi.agentAttendance({ ...params, dateStart: toIsoDate(addDays(new Date(), -(days - 1))), dateEnd: todayIso() }),
    ]);
    return { trend: trend.data || [], agents: attendance.agents || [] };
  }, [department, days]);

  const list = services.data?.data || [];
  const columns = [
    { key: 'agent', header: 'Agent', render: (a) => <PersonCell user={a} sub={a.department?.name || 'Sans service'} /> },
    { key: 'worked', header: 'Jours travaillés', className: 'num', render: (a) => `${a.daysWorked} / ${a.daysExpected}` },
    { key: 'late', header: 'Retards', className: 'num', render: (a) => a.daysLate },
    { key: 'absent', header: 'Absences', className: 'num', render: (a) => a.daysAbsent },
    { key: 'leave', header: 'Congés', className: 'num', render: (a) => a.daysLeave },
    { key: 'ot', header: 'Heures sup.', className: 'num', render: (a) => (a.overtimeMinutes ? formatDuration(a.overtimeMinutes) : '—') },
    { key: 'rate', header: 'Assiduité', width: 190, render: (a) => (a.attendanceRate == null ? <span className="muted">—</span> : (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Progress value={a.attendanceRate} tone={toneFor(a.attendanceRate)} label="Assiduité" />
        <span className="num">{Math.round(a.attendanceRate)} %</span>
      </div>
    )) },
  ];

  return (
    <>
      <PageHeader
        title={rh ? `Bonjour ${user.prenom}` : 'Mon équipe'}
        subtitle={formatLongDate(todayIso())}
        actions={(
          <>
            {(rh || list.length > 1) && (
              <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Service" style={{ minWidth: 200 }}>
                <option value="">{rh ? 'Tous les services' : 'Toute mon équipe'}</option>
                {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                {rh && services.data?.unassigned > 0 && <option value="none">Sans service</option>}
              </Select>
            )}
            <span className="live">Actualisé automatiquement</span>
          </>
        )}
      />

      <Async state={today}>
        {({ kpis, hourly, latest, pending }) => (
          <div className="stack">
            <div className="kpi-grid kpi-grid-5">
              <StatCard icon="users" tone="success" label="Présents" value={kpis.agentsPresent ?? 0}
                hint={kpis.workingDay === false ? 'Jour non ouvré (heures sup.)' : `sur ${kpis.totalAgents ?? 0} agents${kpis.attendanceRate != null ? ` · ${kpis.attendanceRate} %` : ''}`} />
              <StatCard icon="clock" tone="warning" label="Retards" value={kpis.lateArrivals ?? 0} hint="arrivés après 08:00" />
              <StatCard icon="alert" tone="danger" label="Absents" value={kpis.agentsAbsent ?? 0} hint="sans pointage ni congé" />
              <StatCard icon="calendar" label="En congé" value={kpis.agentsOnLeave ?? 0} hint="congés approuvés" />
              <StatCard icon="home" label="Par bâtiment" value={`${kpis.byBuilding?.SIEGE ?? 0} · ${kpis.byBuilding?.ANNEXE ?? 0}`} hint="Siège · Annexe" />
            </div>

            <div className="dash-grid" style={{ marginBottom: 0 }}>
              <Card title="Affluence du jour" subtitle="Arrivées et départs par heure"><HourlyChart data={hourly} /></Card>
              <Card title="Derniers pointages" padded={false} actions={<Link to={`${base}/pointages`}>Tout voir</Link>}>
                {latest.length === 0 ? <EmptyState icon="clock" title="Aucun pointage aujourd'hui" /> : (
                  <ul className="feed">
                    {latest.map((p) => (
                      <li key={p.id}>
                        <div className="feed-main"><PersonCell user={p.agent} sub={BUILDING_LABEL[p.building]} /></div>
                        <Badge tone={p.type === 'ENTRY' ? (isLate(p.datetime) ? 'warning' : 'success') : 'info'}>{TYPE_LABEL[p.type]}</Badge>
                        <span className="feed-time num">{formatTime(p.datetime)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {rh && (
              <Card title="Congés à valider" padded={false} actions={<Link to="/admin/conges">Toutes les demandes</Link>}>
                {pending.length === 0 ? <EmptyState icon="check" title="Aucune demande en attente">Tout est à jour.</EmptyState> : pending.slice(0, 4).map((l) => (
                  <div className="leave-item" key={l.id}>
                    <div className="leave-item-head">
                      <PersonCell user={personFromName(l.userName, l.user)} />
                      <Badge tone="warning">{plural(workingDays(l.startDate, l.endDate), 'jour ouvré', 'jours ouvrés')}</Badge>
                    </div>
                    <div className="leave-item-dates">Du {formatDate(l.startDate)} au {formatDate(l.endDate)}{l.reason ? ` · ${l.reason}` : ''}</div>
                    <LeaveActions leave={l} busy={decision.busy} onApprove={decision.approve} onReject={decision.reject} />
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </Async>

      <div className="stack" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="section-bar">
          <h2>Évolution et assiduité</h2>
          <Segmented label="Période" options={RANGES} value={days} onChange={setDays} />
        </div>
        <Async state={period}>
          {({ trend, agents }) => {
            const sorted = [...agents].sort((a, b) => (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101));
            return (
              <>
                <Card title="Évolution quotidienne" subtitle={`Présents, retards, absents et congés sur ${days} jours`}><TrendChart data={trend} /></Card>
                <Card title="Assiduité par agent" subtitle="Du moins au plus assidu · les congés approuvés ne comptent pas comme des absences" padded={false}>
                  <DataTable columns={columns} rows={sorted} rowKey="id" dense empty={<EmptyState icon="users" title="Aucun agent" />} />
                </Card>
              </>
            );
          }}
        </Async>
      </div>
    </>
  );
}
