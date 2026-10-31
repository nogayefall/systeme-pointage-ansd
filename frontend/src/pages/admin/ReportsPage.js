import React, { useMemo, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { reportsApi, servicesApi, usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/FeedbackContext';
import {
  Async, Badge, Button, Card, DataTable, EmptyState, Input, PageHeader, PersonCell, Progress, Segmented, Select,
} from '../../components/ui';
import { downloadCsv, printTable } from '../../utils/exporters';
import { isRh } from '../../utils/roles';
import {
  ANOMALY_LABEL, BUILDING_LABEL, DAY_STATUS, METHOD_LABEL, TYPE_LABEL, addDays, formatDate, formatDuration, formatTime, fullName,
  toIsoDate, todayIso,
} from '../../utils/formatters';
import './admin.css';

const TABS = [
  { value: 'daily', label: 'Détail journalier' },
  { value: 'summary', label: 'Synthèse' },
  { value: 'pointages', label: 'Pointages' },
  { value: 'anomalies', label: 'Anomalies' },
];
const GROUPS = [
  { value: 'agent', label: 'Par agent' },
  { value: 'department', label: 'Par service' },
  { value: 'building', label: 'Par bâtiment' },
];
/** 485 → « 8:05 » (lisible dans Excel). */
const hm = (min) => `${Math.floor((min || 0) / 60)}:${String(Math.round((min || 0) % 60)).padStart(2, '0')}`;

export default function ReportsPage() {
  const { user } = useAuth();
  const rh = isRh(user);
  const toast = useToast();
  const [tab, setTab] = useState('daily');
  const [group, setGroup] = useState('agent');
  const [dateStart, setDateStart] = useState(toIsoDate(addDays(new Date(), -29)));
  const [dateEnd, setDateEnd] = useState(todayIso());
  const [department, setDepartment] = useState('');
  const [agentId, setAgentId] = useState('');
  const [building, setBuilding] = useState('');
  const [anomalyType, setAnomalyType] = useState('');

  const services = useFetch(() => servicesApi.list(), []);
  const agents = useFetch(() => usersApi.agents(department ? { departmentId: department } : undefined), [department]);
  const base = { dateStart, dateEnd, departmentId: department || undefined };

  const state = useFetch(() => {
    if (tab === 'daily') return reportsApi.daily({ ...base, agentId: agentId || undefined });
    if (tab === 'summary') return reportsApi.attendance({ ...base, groupBy: group });
    if (tab === 'pointages') return reportsApi.pointages({ ...base, agentId: agentId || undefined, building: building || undefined });
    return reportsApi.anomalies({ ...base, agentId: agentId || undefined, type: anomalyType || undefined });
  }, [tab, group, dateStart, dateEnd, department, agentId, building, anomalyType]);

  const rows = useMemo(() => state.data?.data || [], [state.data]);

  // Tableau exporté (même contenu que l'écran).
  const table = useMemo(() => {
    if (tab === 'daily') {
      return {
        headers: ['Date', 'Matricule', 'Agent', 'Service', 'Bâtiment', 'Arrivée', 'Départ', 'Heures normales', 'Heures sup.', 'Statut'],
        cells: rows.map((r) => [formatDate(r.date), r.agent.matricule, fullName(r.agent), r.agent.department?.name || '', BUILDING_LABEL[r.building] || '',
          r.first ? formatTime(r.first) : '', r.last ? formatTime(r.last) : '', hm(r.normalMinutes), hm(r.overtimeMinutes), DAY_STATUS[r.status]?.label || r.status]),
      };
    }
    if (tab === 'summary') {
      return {
        headers: [GROUPS.find((g) => g.value === group).label.replace('Par ', '').replace(/^./, (c) => c.toUpperCase()), 'Jours travaillés', 'Retards', 'Absences', 'Congés', 'Heures normales', 'Heures sup.', 'Assiduité (%)'],
        cells: rows.map((r) => [r.label, r.daysWorked, r.daysLate, r.daysAbsent, r.daysLeave, hm(r.normalMinutes), hm(r.overtimeMinutes), r.attendanceRate ?? '']),
      };
    }
    if (tab === 'pointages') {
      return {
        headers: ['Matricule', 'Agent', 'Service', 'Type', 'Bâtiment', 'Mode', 'Date', 'Heure'],
        cells: rows.map((p) => [p.agent.matricule, fullName(p.agent), p.agent.department?.name || '', TYPE_LABEL[p.type], BUILDING_LABEL[p.building], METHOD_LABEL[p.method] || p.method, formatDate(p.datetime), formatTime(p.datetime)]),
      };
    }
    return {
      headers: ['Date', 'Matricule', 'Agent', 'Service', 'Anomalie', 'Arrivée', 'Départ'],
      cells: rows.map((r) => [formatDate(r.date), r.agent.matricule, fullName(r.agent), r.agent.department?.name || '', ANOMALY_LABEL[r.type].label, r.first ? formatTime(r.first) : '', r.last ? formatTime(r.last) : '']),
    };
  }, [tab, group, rows]);

  const filename = `rapport-${tab}-${dateStart}_${dateEnd}`;
  const subtitle = `Période du ${formatDate(dateStart)} au ${formatDate(dateEnd)}${department ? ' · service filtré' : ''}`;
  const empty = rows.length === 0;

  const hours = (min) => (min ? formatDuration(min) : '—');
  const rate = (r) => (r.attendanceRate == null ? <span className="muted">—</span> : (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Progress value={r.attendanceRate} tone={r.attendanceRate >= 90 ? 'success' : r.attendanceRate >= 75 ? 'warning' : 'danger'} label="Assiduité" />
      <span className="num">{Math.round(r.attendanceRate)} %</span>
    </div>
  ));

  const columns = {
    daily: [
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'agent', header: 'Agent', render: (r) => <PersonCell user={r.agent} sub={r.agent.department?.name || r.agent.matricule} /> },
      { key: 'building', header: 'Bâtiment', render: (r) => BUILDING_LABEL[r.building] || '—' },
      { key: 'in', header: 'Arrivée', className: 'num', render: (r) => (r.first ? formatTime(r.first) : '—') },
      { key: 'out', header: 'Départ', className: 'num', render: (r) => (r.last ? formatTime(r.last) : (r.incomplete ? <Badge tone="warning">Non pointé</Badge> : '—')) },
      { key: 'normal', header: 'H. normales', className: 'num', render: (r) => hours(r.normalMinutes) },
      { key: 'ot', header: 'H. sup.', className: 'num', render: (r) => hours(r.overtimeMinutes) },
      { key: 'st', header: 'Statut', render: (r) => <Badge tone={DAY_STATUS[r.status]?.tone}>{DAY_STATUS[r.status]?.label}</Badge> },
    ],
    summary: [
      { key: 'label', header: group === 'agent' ? 'Agent' : group === 'department' ? 'Service' : 'Bâtiment', render: (r) => <strong>{r.label}</strong> },
      ...(group === 'department' ? [{ key: 'agents', header: 'Agents', className: 'num', render: (r) => r.agents }] : []),
      { key: 'worked', header: 'Jours travaillés', className: 'num', render: (r) => r.daysWorked },
      { key: 'late', header: 'Retards', className: 'num', render: (r) => r.daysLate },
      ...(group !== 'building' ? [
        { key: 'absent', header: 'Absences', className: 'num', render: (r) => r.daysAbsent },
        { key: 'leave', header: 'Congés', className: 'num', render: (r) => r.daysLeave },
      ] : []),
      { key: 'normal', header: 'H. normales', className: 'num', render: (r) => hours(r.normalMinutes) },
      { key: 'ot', header: 'H. sup.', className: 'num', render: (r) => hours(r.overtimeMinutes) },
      ...(group !== 'building' ? [{ key: 'rate', header: 'Assiduité', width: 190, render: rate }] : []),
    ],
    pointages: [
      { key: 'agent', header: 'Agent', render: (p) => <PersonCell user={p.agent} sub={p.agent.department?.name || p.agent.matricule} /> },
      { key: 'type', header: 'Type', render: (p) => <Badge tone={p.type === 'ENTRY' ? 'success' : 'info'}>{TYPE_LABEL[p.type]}</Badge> },
      { key: 'building', header: 'Bâtiment', render: (p) => BUILDING_LABEL[p.building] },
      { key: 'mode', header: 'Mode', render: (p) => METHOD_LABEL[p.method] || p.method },
      { key: 'date', header: 'Date', render: (p) => formatDate(p.datetime) },
      { key: 'time', header: 'Heure', className: 'num', render: (p) => formatTime(p.datetime) },
    ],
    anomalies: [
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'agent', header: 'Agent', render: (r) => <PersonCell user={r.agent} sub={r.agent.department?.name || r.agent.matricule} /> },
      { key: 'type', header: 'Anomalie', render: (r) => <Badge tone={ANOMALY_LABEL[r.type].tone}>{ANOMALY_LABEL[r.type].label}</Badge> },
      { key: 'in', header: 'Arrivée', className: 'num', render: (r) => (r.first ? formatTime(r.first) : '—') },
      { key: 'out', header: 'Départ', className: 'num', render: (r) => (r.last ? formatTime(r.last) : '—') },
    ],
  }[tab];

  const list = services.data?.data || [];
  const showAgentFilter = tab !== 'summary';

  return (
    <>
      <PageHeader
        title="Rapports"
        subtitle="Heures normales et supplémentaires, absences et anomalies, exportables sur n'importe quelle période"
        actions={(
          <>
            <Button icon="download" disabled={empty} onClick={() => downloadCsv(`${filename}.csv`, table.headers, table.cells)}>Exporter en CSV</Button>
            <Button icon="print" disabled={empty} onClick={() => { if (!printTable(`Rapport — ${TABS.find((t) => t.value === tab).label}`, subtitle, table.headers, table.cells)) toast.error('Autorisez les fenêtres pop-up pour imprimer.'); }}>Imprimer / PDF</Button>
          </>
        )}
      />
      <div className="toolbar">
        <Segmented label="Type de rapport" options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="toolbar">
        <Input type="date" value={dateStart} max={dateEnd} onChange={(e) => setDateStart(e.target.value)} aria-label="Du" />
        <Input type="date" value={dateEnd} min={dateStart} onChange={(e) => setDateEnd(e.target.value)} aria-label="Au" />
        {(rh || list.length > 1) && (
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); setAgentId(''); }} aria-label="Service">
            <option value="">{rh ? 'Tous les services' : 'Toute mon équipe'}</option>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {rh && services.data?.unassigned > 0 && <option value="none">Sans service</option>}
          </Select>
        )}
        {showAgentFilter && (
          <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agent">
            <option value="">Tous les agents</option>
            {(agents.data?.data || []).map((a) => <option key={a.id} value={a.id}>{fullName(a)}</option>)}
          </Select>
        )}
        {tab === 'pointages' && (
          <Select value={building} onChange={(e) => setBuilding(e.target.value)} aria-label="Bâtiment">
            <option value="">Siège et Annexe</option>
            <option value="SIEGE">Siège</option>
            <option value="ANNEXE">Annexe</option>
          </Select>
        )}
        {tab === 'anomalies' && (
          <Select value={anomalyType} onChange={(e) => setAnomalyType(e.target.value)} aria-label="Type d'anomalie">
            <option value="">Toutes les anomalies</option>
            <option value="MISSING_EXIT">Départ non pointé</option>
            <option value="ABSENT">Absent sans justificatif</option>
          </Select>
        )}
        {tab === 'summary' && <Segmented label="Regroupement" options={GROUPS} value={group} onChange={setGroup} />}
      </div>

      {tab === 'anomalies' && state.data?.summary && (
        <p className="muted" style={{ marginBottom: 12 }}>
          {state.data.summary.MISSING_EXIT} départ(s) non pointé(s) · {state.data.summary.ABSENT} jour(s) d'absence sans pointage ni congé.
          Le système considère l'agent absent : la RH peut lui demander un justificatif.
        </p>
      )}

      <Card padded={false}>
        <Async state={state}>
          {() => <DataTable columns={columns} rows={rows} rowKey={(r) => `${r.id ?? r.key ?? ''}-${r.date ?? ''}-${r.agent?.id ?? ''}-${r.type ?? ''}`} dense empty={<EmptyState title="Aucune donnée sur cette période" />} />}
        </Async>
      </Card>
    </>
  );
}
