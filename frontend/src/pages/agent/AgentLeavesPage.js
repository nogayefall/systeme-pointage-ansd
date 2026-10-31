import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { errorMessage, leavesApi } from '../../services/api';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import {
  Async, Badge, Button, Card, DataTable, EmptyState, Field, IconButton, Input, PageHeader, RowActions, Textarea,
} from '../../components/ui';
import { LEAVE_STATUS, formatDate, plural, todayIso, workingDays } from '../../utils/formatters';
import '../admin/admin.css';

export default function AgentLeavesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const state = useFetch(() => leavesApi.list(), []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.startDate) errs.startDate = 'Choisissez une date de début.';
    if (!form.endDate) errs.endDate = 'Choisissez une date de fin.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) errs.endDate = 'La fin doit être après le début.';
    if (form.reason.length > 255) errs.reason = '255 caractères maximum.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await leavesApi.create({ startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim() || undefined });
      toast.success('Demande envoyée à l’administration RH.');
      setForm({ startDate: '', endDate: '', reason: '' });
      state.reload({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  const cancel = async (l) => {
    const ok = await confirm({ title: 'Annuler la demande', message: `Annuler votre demande du ${formatDate(l.startDate)} au ${formatDate(l.endDate)} ?`, confirmLabel: 'Annuler la demande', cancelLabel: 'Conserver', danger: true });
    if (!ok) return;
    try {
      await leavesApi.cancel(l.id);
      toast.success('Demande annulée.');
      state.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'p', header: 'Période', render: (l) => `${formatDate(l.startDate)} → ${formatDate(l.endDate)}` },
    { key: 'd', header: 'Durée', render: (l) => plural(workingDays(l.startDate, l.endDate), 'jour ouvré', 'jours ouvrés') },
    { key: 'r', header: 'Motif', render: (l) => l.reason || <span className="muted">—</span> },
    { key: 's', header: 'Statut', render: (l) => <Badge tone={LEAVE_STATUS[l.status]?.tone}>{LEAVE_STATUS[l.status]?.label}</Badge> },
    { key: 'by', header: 'Décision', render: (l) => (l.approvedByName ? <span className="muted">{l.approvedByName}</span> : <span className="muted">—</span>) },
    { key: 'a', header: '', align: 'right', width: 60, render: (l) => (l.status === 'PENDING'
      ? <RowActions><IconButton icon="x" variant="danger" label="Annuler la demande" onClick={() => cancel(l)} /></RowActions> : null) },
  ];

  return (
    <>
      <PageHeader title="Mes congés" subtitle="Faites une demande et suivez sa validation" />
      <div className="stack">
        <Card title="Nouvelle demande">
          <form onSubmit={submit} noValidate className="form-grid">
            <Field label="Du" required error={errors.startDate}><Input type="date" min={todayIso()} value={form.startDate} onChange={set('startDate')} /></Field>
            <Field label="Au" required error={errors.endDate}><Input type="date" min={form.startDate || todayIso()} value={form.endDate} onChange={set('endDate')} /></Field>
            <Field label="Motif" error={errors.reason} className="span-2" hint={form.startDate && form.endDate && form.endDate >= form.startDate ? `${plural(workingDays(form.startDate, form.endDate), 'jour ouvré', 'jours ouvrés')} demandés` : undefined}>
              <Textarea value={form.reason} onChange={set('reason')} maxLength={255} />
            </Field>
            <div className="span-2"><Button variant="primary" type="submit" icon="check" loading={saving}>Envoyer la demande</Button></div>
          </form>
        </Card>
        <Card title="Historique" padded={false}>
          <Async state={state}>
            {(res) => <DataTable columns={columns} rows={res.data} empty={<EmptyState icon="calendar" title="Aucune demande" />} />}
          </Async>
        </Card>
      </div>
    </>
  );
}
