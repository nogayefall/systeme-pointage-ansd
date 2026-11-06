import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { badgesApi, errorMessage, usersApi } from '../../services/api';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import {
  Async, Button, Card, DataTable, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, PersonCell, RowActions, Select,
} from '../../components/ui';
import { fullName } from '../../utils/formatters';
import './admin.css';

function BadgeForm({ agents, onClose, onSaved }) {
  const [badgeCode, setBadgeCode] = useState('');
  const [agentId, setAgentId] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[0-9a-zA-Z-]{3,}$/.test(badgeCode.trim())) errs.badgeCode = 'Code invalide (lettres, chiffres et tirets, 3 caractères minimum).';
    if (!agentId) errs.agentId = 'Choisissez un agent.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError('');
    try {
      await badgesApi.create({ badgeCode: badgeCode.trim(), agentId: Number(agentId) });
      onSaved();
    } catch (err) { setApiError(errorMessage(err)); setSaving(false); }
  };

  return (
    <Modal title="Associer un badge" size="sm" onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" type="submit" form="badge-form" loading={saving}>Associer</Button></>}>
      <form id="badge-form" onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
        {apiError && <p className="field-msg field-msg-error" role="alert">{apiError}</p>}
        <Field label="Code du badge" required error={errors.badgeCode} hint="Scannez le badge dans ce champ ou saisissez le code.">
          <Input value={badgeCode} onChange={(e) => setBadgeCode(e.target.value)} data-autofocus autoComplete="off" />
        </Field>
        <Field label="Agent" required error={errors.agentId}>
          <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{fullName(a)} ({a.matricule})</option>)}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

export default function BadgesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [creating, setCreating] = useState(false);
  const agents = useFetch(() => usersApi.agents(), []);
  const state = useFetch(() => badgesApi.list({ page, limit: pageSize }), [page, pageSize]);

  const remove = async (b) => {
    const ok = await confirm({ title: 'Dissocier le badge', message: `Dissocier le badge ${b.badgeCode} de ${fullName(b.agent)} ?`, confirmLabel: 'Dissocier', danger: true });
    if (!ok) return;
    try {
      await badgesApi.remove(b.id);
      toast.success('Badge dissocié.');
      state.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'code', header: 'Code du badge', render: (b) => <code>{b.badgeCode}</code> },
    { key: 'agent', header: 'Agent', render: (b) => <PersonCell user={b.agent} /> },
    { key: 'actions', header: '', align: 'right', width: 60, render: (b) => (
      <RowActions><IconButton icon="trash" variant="danger" label="Dissocier le badge" onClick={() => remove(b)} /></RowActions>
    ) },
  ];

  return (
    <>
      <PageHeader title="Badges" subtitle="Association des badges aux agents"
        actions={<Button variant="primary" icon="plus" disabled={!agents.data} onClick={() => setCreating(true)}>Associer un badge</Button>} />
      <Card padded={false}>
        <Async state={state}>
          {(res) => (
            <>
              <DataTable paginate={false} columns={columns} rows={res.data} empty={<EmptyState icon="badge" title="Aucun badge associé" />} />
              <Pagination page={res.pagination.page} pages={res.pagination.pages} total={res.pagination.total} pageSize={pageSize}
                onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} unit="badges" />
            </>
          )}
        </Async>
      </Card>
      {creating && agents.data && (
        <BadgeForm agents={agents.data.data} onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); toast.success('Badge associé.'); state.reload({ silent: true }); }} />
      )}
    </>
  );
}
