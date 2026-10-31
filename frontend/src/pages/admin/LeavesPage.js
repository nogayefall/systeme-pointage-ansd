import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useLeaveDecision from '../../hooks/useLeaveDecision';
import { leavesApi } from '../../services/api';
import { Async, Badge, Card, DataTable, EmptyState, PageHeader, PersonCell, Segmented } from '../../components/ui';
import LeaveActions from '../../components/LeaveActions';
import { LEAVE_STATUS, formatDate, personFromName, plural, workingDays } from '../../utils/formatters';
import './admin.css';

const FILTERS = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'REJECTED', label: 'Refusées' },
];

export default function LeavesPage() {
  const [filter, setFilter] = useState('PENDING');
  const state = useFetch(() => leavesApi.list(), []);
  const decision = useLeaveDecision(() => state.reload({ silent: true }));

  const columns = [
    { key: 'agent', header: 'Agent', render: (l) => <PersonCell user={personFromName(l.userName, l.user)} /> },
    { key: 'period', header: 'Période', render: (l) => `${formatDate(l.startDate)} → ${formatDate(l.endDate)}` },
    { key: 'days', header: 'Durée', render: (l) => plural(workingDays(l.startDate, l.endDate), 'jour ouvré', 'jours ouvrés') },
    { key: 'reason', header: 'Motif', render: (l) => l.reason || <span className="muted">—</span> },
    { key: 'status', header: 'Statut', render: (l) => (
      <Badge tone={LEAVE_STATUS[l.status]?.tone}>{LEAVE_STATUS[l.status]?.label || l.status}</Badge>
    ) },
    { key: 'by', header: 'Décision', render: (l) => (l.approvedByName ? <span className="muted">{l.approvedByName} · {formatDate(l.approvedAt)}</span> : <span className="muted">—</span>) },
    { key: 'actions', header: '', align: 'right', render: (l) => (l.status === 'PENDING'
      ? <LeaveActions leave={l} busy={decision.busy} onApprove={decision.approve} onReject={decision.reject} /> : null) },
  ];

  return (
    <>
      <PageHeader title="Congés" subtitle="Demandes de congé des agents" />
      <div className="toolbar"><Segmented label="Statut" options={FILTERS} value={filter} onChange={setFilter} /></div>
      <Card padded={false}>
        <Async state={state}>
          {({ data }) => {
            const rows = filter === 'ALL' ? data : data.filter((l) => l.status === filter);
            return <DataTable columns={columns} rows={rows} empty={<EmptyState icon="calendar" title="Aucune demande" />} />;
          }}
        </Async>
      </Card>
    </>
  );
}
