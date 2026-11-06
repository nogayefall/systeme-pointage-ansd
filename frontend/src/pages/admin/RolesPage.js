import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { errorMessage, permissionsApi, rolesApi } from '../../services/api';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import { Async, Badge, Button, Card, DataTable, EmptyState, IconButton, RowActions } from '../../components/ui';
import RoleFormModal from '../../components/roles/RoleFormModal';
import PageHero from '../../components/layout/PageHero';
import { getPermissionDisplay } from '../../features/roles/permissionLabels';
import { plural } from '../../utils/formatters';
import './admin.css';
import './roles.css';

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
        <strong>{r.name}</strong> {SYSTEM_ROLES.includes(r.name) && (
          <span className="role-system-lock" role="img" tabIndex={0} title="Rôle système" aria-label="Rôle système">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2M8 10v1.5" />
            </svg>
          </span>
        )}
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{r.description || '—'}</div>
      </div>
    ) },
    { key: 'perms', header: 'Permissions', render: (r) => (
      r.permissions?.length
        ? (
          <div className="role-permission-list">
            {r.permissions.slice(0, 3).map((p) => (
              <Badge key={p.id}>{getPermissionDisplay(p.name).label}</Badge>
            ))}
            {r.permissions.length > 3 && (
              <span
                className="badge badge-neutral role-permission-more"
                title={r.permissions.slice(3).map((p) => getPermissionDisplay(p.name).label).join('\n')}
                aria-label={`Autres permissions : ${r.permissions.slice(3).map((p) => getPermissionDisplay(p.name).label).join(', ')}`}
                role="img"
                tabIndex={0}
              >
                +{r.permissions.length - 3}
              </span>
            )}
          </div>
        )
        : <span className="muted">Aucune</span>
    ) },
    { key: 'users', header: 'Utilisateurs', className: 'role-users-cell', render: (r) => (
      <span className="role-users-count">{plural(r.usersCount ?? 0, 'utilisateur', 'utilisateurs')}</span>
    ) },
    { key: 'actions', header: '', align: 'right', width: 90, render: (r) => (
      <RowActions>
        <IconButton icon="edit" label="Modifier" onClick={() => setForm(r)} />
        <IconButton icon="trash" variant="danger" label="Supprimer" disabled={SYSTEM_ROLES.includes(r.name)} onClick={() => remove(r)} />
      </RowActions>
    ) },
  ];

  return (
    <div className="roles-page">
      <PageHero title="Rôles et permissions" subtitle="Définissez ce que chaque profil peut faire"
        action={<Button variant="primary" icon="plus" disabled={!state.data} onClick={() => setForm({})}>Nouveau rôle</Button>} />
      <Card className="roles-data-card" padded={false}>
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
    </div>
  );
}
