import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { statsApi } from '../../services/api';
import { Async, Card, DataTable, EmptyState, PageHeader, PersonCell, Progress, Segmented, StatCard } from '../../components/ui';
import { HourlyChart, TrendChart } from '../../components/charts/charts';
import { addDays, personFromName, todayIso, toIsoDate } from '../../utils/formatters';
import './admin.css';

const RANGES = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
];

const toneFor = (rate) => (rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger');

export default function StatisticsPage() {
  const [days, setDays] = useState(30);
  const state = useFetch(async () => {
    const start = toIsoDate(addDays(new Date(), -days));
    const [summary, hourly, trend, attendance] = await Promise.all([
      statsApi.summary(), statsApi.hourly(), statsApi.trend(days), statsApi.agentAttendance(start, todayIso()),
    ]);
    return {
      kpis: summary.kpis || {}, hourly: hourly.data || [], trend: trend.data || [],
      agents: attendance.agents || [],
    };
  }, [days]);

  const columns = [
    { key: 'agent', header: 'Agent', render: (a) => <PersonCell user={personFromName(a.nom, a.agent)} /> },
    { key: 'worked', header: 'Jours travaillés', className: 'num', render: (a) => a.daysWorked },
    { key: 'absent', header: 'Absences', className: 'num', render: (a) => a.daysAbsent },
    { key: 'late', header: 'Retards', className: 'num', render: (a) => a.lateArrivals },
    { key: 'rate', header: 'Assiduité', width: 220, render: (a) => (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Progress value={a.attendanceRate} tone={toneFor(a.attendanceRate)} label="Assiduité" />
        <span className="num">{Math.round(a.attendanceRate)} %</span>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        title="Statistiques"
        subtitle="Vue d'ensemble de l'assiduité"
        actions={<Segmented label="Période" options={RANGES} value={days} onChange={setDays} />}
      />
      <Async state={state}>
        {({ kpis, hourly, trend, agents }) => {
          const sorted = [...agents].sort((a, b) => a.attendanceRate - b.attendanceRate);
          return (
            <div className="stack">
              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                <StatCard icon="users" label="Agents" value={kpis.totalAgents ?? 0} hint="actifs" />
                <StatCard icon="check" tone="success" label="Présents aujourd'hui" value={kpis.agentsPresent ?? 0} hint={`${kpis.attendanceRate ?? 0} % de présence`} />
                <StatCard icon="clock" tone="warning" label="Retards aujourd'hui" value={kpis.lateArrivals ?? 0} />
                <StatCard icon="alert" tone="danger" label="Absents aujourd'hui" value={kpis.agentsAbsent ?? 0} hint={kpis.agentsOnLeave ? `+ ${kpis.agentsOnLeave} en congé` : undefined} />
              </div>
              <div className="dash-grid" style={{ marginBottom: 0 }}>
                <Card title="Évolution des pointages" subtitle={`${days} derniers jours`}><TrendChart data={trend} /></Card>
                <Card title="Affluence du jour" subtitle="Par heure"><HourlyChart data={hourly} /></Card>
              </div>
              <Card title="Assiduité par agent" subtitle={`Sur les ${days} derniers jours — du moins au plus assidu`} padded={false}>
                <DataTable columns={columns} rows={sorted} rowKey="agent" dense empty={<EmptyState title="Aucun agent" />} />
              </Card>
            </div>
          );
        }}
      </Async>
    </>
  );
}
