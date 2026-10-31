import React, { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { errorMessage, rolesApi, servicesApi, usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm, useToast } from '../../contexts/FeedbackContext';
import {
  Async, Badge, Button, Card, DataTable, EmptyState, IconButton, PageHeader, Pagination, PersonCell, RowActions, SearchInput, Select,
} from '../../components/ui';
import UserFormModal from '../../components/users/UserFormModal';
import SecretModal from '../../components/users/SecretModal';
import { fullName } from '../../utils/formatters';
import './admin.css';

export default function UsersPage() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | {} (création) | utilisateur (modification)
  const [secret, setSecret] = useState(null);
  const dq = useDebounce(q);

  const roles = useFetch(() => rolesApi.list(), []);
  const services = useFetch(() => servicesApi.list(), []);
  const state = useFetch(() => usersApi.list({ page, limit: 10, q: dq || undefined, role: role || undefined }), [page, dq, role]);

  const onSaved = (result) => {
    setForm(null);
    state.reload({ silent: true });
    if (result.mode === 'create') {
      toast.success('Utilisateur créé.');
      if (result.plainPassword) {
        setSecret({ title: 'Compte créé', identifier: result.user.matricule, password: result.plainPassword, intro: 'Mot de passe initial de ce compte :' });
      }
    } else toast.success('Modifications enregistrées.');
  };

  const resetPassword = async (u) => {
    const ok = await confirm({ title: 'Réinitialiser le mot de passe', message: `Générer un nouveau mot de passe pour ${fullName(u)} ? Ses sessions ouvertes seront fermées.`, confirmLabel: 'Réinitialiser' });
    if (!ok) return;
    try {
      const res = await usersApi.update(u.id, { resetPassword: true });
      setSecret({ title: 'Mot de passe réinitialisé', identifier: u.matricule, password: res.plainPassword, intro: `Nouveau mot de passe de ${fullName(u)} :` });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const remove = async (u) => {
    const ok = await confirm({ title: "Supprimer l'utilisateur", message: `Supprimer définitivement ${fullName(u)} ? Cette action est irréversible.`, confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    try {
      await usersApi.remove(u.id);
      toast.success('Utilisateur supprimé.');
      state.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: 'person', header: 'Utilisateur', render: (u) => <PersonCell user={u} /> },
    { key: 'email', header: 'E-mail', render: (u) => <span className="muted">{u.email}</span> },
    { key: 'role', header: 'Rôle', render: (u) => <Badge tone="info">{u.role || '—'}</Badge> },
    { key: 'service', header: 'Service', render: (u) => (u.department ? u.department.name : <span className="muted">—</span>) },
    { key: 'status', header: 'Statut', render: (u) => <Badge tone={u.isActive ? 'success' : 'neutral'} dot>{u.isActive ? 'Actif' : 'Désactivé'}</Badge> },
    { key: 'actions', header: '', align: 'right', width: 130, render: (u) => (
      <RowActions>
        <IconButton icon="edit" label="Modifier" onClick={() => setForm(u)} />
        <IconButton icon="key" label="Réinitialiser le mot de passe" onClick={() => resetPassword(u)} />
        <IconButton icon="trash" variant="danger" label="Supprimer" disabled={u.id === me.id} onClick={() => remove(u)} />
      </RowActions>
    ) },
  ];

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Comptes des agents, de la sécurité et de l'administration"
        actions={<Button variant="primary" icon="plus" disabled={!roles.data} onClick={() => setForm({})}>Nouvel utilisateur</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Nom, matricule ou e-mail…" />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Rôle">
          <option value="">Tous les rôles</option>
          {(roles.data?.data || []).map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </Select>
      </div>
      <Card padded={false}>
        <Async state={state}>
          {(res) => (
            <>
              <DataTable columns={columns} rows={res.data} empty={<EmptyState icon="users" title="Aucun utilisateur trouvé" />} />
              <Pagination page={res.pagination.page} pages={res.pagination.pages} total={res.pagination.total} onChange={setPage} unit="utilisateurs" />
            </>
          )}
        </Async>
      </Card>
      {form && roles.data && (
        <UserFormModal user={form.id ? form : null} roles={roles.data.data} departments={services.data?.data || []} onClose={() => setForm(null)} onSaved={onSaved} />
      )}
      {secret && <SecretModal {...secret} onClose={() => setSecret(null)} />}
    </>
  );
}
