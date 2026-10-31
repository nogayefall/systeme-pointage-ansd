import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { errorMessage, permissionsApi, rolesApi } from '../../services/api';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import { Async, Badge, Button, Card, DataTable, EmptyState, IconButton, PageHeader, RowActions } from '../../components/ui';
import RoleFormModal from '../../components/roles/RoleFormModal';
import { plural } from '../../utils/formatters';
import './admin.css';

const SYSTEM_ROLES = ['Super Administrateur', 'Administrateur RH', 'Agent de Sécurité', 'Supérieur hiérarchique', 'Agent'];

export default function RolesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const state = useFetch(async () => {
    const [roles, permissions] = await Promise.all([rolesApi.list(), permissionsApi.list()]);
    return { roles: roles.data || [], permissions: permissions.data || [] };
  }, []);

  const remove = async (r) => {
    const ok = await confirm({ title: 'Supprimer le rôle', message: `Supprimer le rôle « ${r.name} » ?`, confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    try {
      await rolesApi.remove(r.id);
      toast.success('Rôle supprimé.');
      state.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'name', header: 'Rôle', render: (r) => (
      <div>
        <strong>{r.name}</strong> {SYSTEM_ROLES.includes(r.name) && <Badge tone="info">Système</Badge>}
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{r.description || '—'}</div>
      </div>
    ) },
    { key: 'perms', header: 'Permissions', render: (r) => (
      r.permissions?.length
        ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{r.permissions.map((p) => <Badge key={p.id}>{p.name}</Badge>)}</div>
        : <span className="muted">Aucune</span>
    ) },
    { key: 'users', header: 'Utilisateurs', className: 'num', render: (r) => plural(r.usersCount ?? 0, 'utilisateur', 'utilisateurs') },
    { key: 'actions', header: '', align: 'right', width: 90, render: (r) => (
      <RowActions>
        <IconButton icon="edit" label="Modifier" onClick={() => setForm(r)} />
        <IconButton icon="trash" variant="danger" label="Supprimer" disabled={SYSTEM_ROLES.includes(r.name)} onClick={() => remove(r)} />
      </RowActions>
    ) },
  ];

  return (
    <>
      <PageHeader title="Rôles et permissions" subtitle="Définissez ce que chaque profil peut faire"
        actions={<Button variant="primary" icon="plus" disabled={!state.data} onClick={() => setForm({})}>Nouveau rôle</Button>} />
      <Card padded={false}>
        <Async state={state}>
          {({ roles }) => <DataTable columns={columns} rows={roles} empty={<EmptyState icon="shield" title="Aucun rôle" />} />}
        </Async>
      </Card>
      {form && state.data && (
        <RoleFormModal role={form.id ? form : null} permissions={state.data.permissions}
          systemRole={SYSTEM_ROLES.includes(form.name)}
          onClose={() => setForm(null)}
          onSaved={(mode) => { setForm(null); toast.success(mode === 'create' ? 'Rôle créé.' : 'Rôle mis à jour.'); state.reload({ silent: true }); }} />
      )}
    </>
  );
}
