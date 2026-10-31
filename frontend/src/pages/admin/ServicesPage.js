import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { errorMessage, servicesApi, usersApi } from '../../services/api';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import {
  Async, Badge, Button, Card, DataTable, EmptyState, Icon, IconButton, PageHeader, PersonCell, RowActions,
} from '../../components/ui';
import ServiceFormModal from '../../components/services/ServiceFormModal';
import MembersModal from '../../components/services/MembersModal';
import { plural } from '../../utils/formatters';
import './admin.css';

export default function ServicesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState(null); // null | {} | service
  const [members, setMembers] = useState(null);
  const [refs, setRefs] = useState({ supervisors: [], employees: [] });
  const [loadingRefs, setLoadingRefs] = useState(false);

  const state = useFetch(() => servicesApi.list(), []);

  /** Chefs possibles et employés : chargés à la demande, à chaque ouverture d'une fenêtre. */
  const withRefs = async (open) => {
    setLoadingRefs(true);
    try {
      const [sup, emp] = await Promise.all([usersApi.supervisors(), usersApi.agents()]);
      setRefs({ supervisors: sup.data || [], employees: emp.data || [] });
      open();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoadingRefs(false);
    }
  };

  const reload = () => state.reload({ silent: true });

  const remove = async (s) => {
    const ok = await confirm({ title: 'Supprimer le service', message: `Supprimer le service « ${s.name} » ?`, confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    try {
      await servicesApi.remove(s.id);
      toast.success('Service supprimé.');
      reload();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'name', header: 'Service', render: (s) => <strong>{s.name}</strong> },
    { key: 'head', header: 'Chef de service', render: (s) => (s.head ? <PersonCell user={s.head} /> : <Badge tone="warning">Non défini</Badge>) },
    { key: 'count', header: 'Agents', className: 'num', render: (s) => plural(s.agentsCount, 'agent', 'agents') },
    { key: 'actions', header: '', align: 'right', width: 130, render: (s) => (
      <RowActions>
        <IconButton icon="users" label="Gérer les agents du service" disabled={loadingRefs} onClick={() => withRefs(() => setMembers(s))} />
        <IconButton icon="edit" label="Modifier" disabled={loadingRefs} onClick={() => withRefs(() => setForm(s))} />
        <IconButton icon="trash" variant="danger" label="Supprimer" onClick={() => remove(s)} />
      </RowActions>
    ) },
  ];

  return (
    <>
      <PageHeader title="Services" subtitle="Organisation des équipes : chaque service a un chef et ses agents"
        actions={<Button variant="primary" icon="plus" loading={loadingRefs} onClick={() => withRefs(() => setForm({}))}>Nouveau service</Button>} />
      <Async state={state}>
        {(res) => (
          <>
            {res.unassigned > 0 && (
              <div className="notice" role="status">
                <Icon name="info" size={18} />
                {plural(res.unassigned, 'agent n’est rattaché', 'agents ne sont rattachés')} à aucun service : ils n’apparaissent dans aucune équipe.
              </div>
            )}
            <Card padded={false}>
              <DataTable columns={columns} rows={res.data} empty={<EmptyState icon="users" title="Aucun service">Créez un premier service puis rattachez-y ses agents.</EmptyState>} />
            </Card>
          </>
        )}
      </Async>
      {form && (
        <ServiceFormModal service={form.id ? form : null} supervisors={refs.supervisors} onClose={() => setForm(null)}
          onSaved={(mode) => { setForm(null); toast.success(mode === 'create' ? 'Service créé.' : 'Service mis à jour.'); reload(); }} />
      )}
      {members && (
        <MembersModal service={members} employees={refs.employees} onClose={() => setMembers(null)}
          onSaved={(n) => { setMembers(null); toast.success(`Équipe enregistrée (${plural(n, 'agent', 'agents')}).`); reload(); }} />
      )}
    </>
  );
}
