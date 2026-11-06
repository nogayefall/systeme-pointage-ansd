import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { errorMessage, pointagesApi, servicesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import {
  Async, Card, DataTable, EmptyState, IconButton, Input, PageHeader, Pagination, PersonCell, RowActions, SearchInput, Select,
} from '../../components/ui';
import { isRh } from '../../utils/roles';
import { BUILDING_LABEL, METHOD_LABEL, formatDate, formatTime, fullName } from '../../utils/formatters';
import PointageTypeBadge, { PointageTypeLegend } from '../../components/pointages/PointageTypeBadge';
import './admin.css';

export default function PointagesPage() {
  const { user } = useAuth();
  const rh = isRh(user);
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [building, setBuilding] = useState('');
  const [department, setDepartment] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const dq = useDebounce(q);

  const services = useFetch(() => servicesApi.list(), []);
  const state = useFetch(
    () => pointagesApi.list({
      page, limit: pageSize, q: dq || undefined, type: type || undefined, building: building || undefined,
      departmentId: department || undefined, dateStart: dateStart || undefined, dateEnd: dateEnd || undefined,
    }),
    [page, pageSize, dq, type, building, department, dateStart, dateEnd]
  );
  const reset = (setter) => (v) => { setter(v); setPage(1); };
  const list = services.data?.data || [];

  const remove = async (p) => {
    const ok = await confirm({
      title: 'Supprimer le pointage',
      message: `Supprimer le pointage de ${fullName(p.agent)} du ${formatDate(p.datetime)} à ${formatTime(p.datetime)} ?`,
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    try {
      await pointagesApi.remove(p.id);
      toast.success('Pointage supprimé.');
      state.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'agent', header: 'Agent', render: (p) => <PersonCell user={p.agent} sub={p.agent.department?.name || p.agent.matricule} /> },
    { key: 'type', header: 'Type', render: (p) => <PointageTypeBadge type={p.type} late={p.late} /> },
    { key: 'date', header: 'Date', render: (p) => formatDate(p.datetime) },
    { key: 'time', header: 'Heure', className: 'num', render: (p) => formatTime(p.datetime) },
    { key: 'building', header: 'Bâtiment', render: (p) => BUILDING_LABEL[p.building] || p.building },
    { key: 'method', header: 'Mode', render: (p) => METHOD_LABEL[p.method] || p.method },
    { key: 'by', header: 'Saisi par', render: (p) => <span className="muted">{p.securityOfficer?.nom ? fullName(p.securityOfficer) : '—'}</span> },
    ...(rh ? [{ key: 'actions', header: '', align: 'right', width: 60, render: (p) => (
      <RowActions><IconButton icon="trash" variant="danger" label="Supprimer le pointage" onClick={() => remove(p)} /></RowActions>
    ) }] : []),
  ];

  return (
    <>
      <PageHeader title="Pointages" subtitle={rh ? 'Historique des arrivées et des départs' : 'Pointages des agents de votre équipe'} />
      <div className="toolbar">
        <SearchInput value={q} onChange={reset(setQ)} placeholder="Nom ou matricule…" />
        {(rh || list.length > 1) && (
          <Select value={department} onChange={(e) => reset(setDepartment)(e.target.value)} aria-label="Service">
            <option value="">{rh ? 'Tous les services' : 'Toute mon équipe'}</option>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {rh && services.data?.unassigned > 0 && <option value="none">Sans service</option>}
          </Select>
        )}
        <Select value={building} onChange={(e) => reset(setBuilding)(e.target.value)} aria-label="Bâtiment">
          <option value="">Siège et Annexe</option>
          <option value="SIEGE">Siège</option>
          <option value="ANNEXE">Annexe</option>
        </Select>
        <Select value={type} onChange={(e) => reset(setType)(e.target.value)} aria-label="Type">
          <option value="">Arrivées et départs</option>
          <option value="ENTRY">Arrivées</option>
          <option value="EXIT">Départs</option>
        </Select>
        <Input type="date" value={dateStart} onChange={(e) => reset(setDateStart)(e.target.value)} aria-label="Du" />
        <Input type="date" value={dateEnd} onChange={(e) => reset(setDateEnd)(e.target.value)} aria-label="Au" />
      </div>
      <PointageTypeLegend />
      <Card padded={false}>
        <Async state={state}>
          {(res) => (
            <>
              <DataTable paginate={false} columns={columns} rows={res.data} empty={<EmptyState title="Aucun pointage">Modifiez les filtres pour élargir la recherche.</EmptyState>} />
              <Pagination page={res.pagination.page} pages={res.pagination.pages} total={res.pagination.total} pageSize={pageSize}
                onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} unit="pointages" />
            </>
          )}
        </Async>
      </Card>
    </>
  );
}
