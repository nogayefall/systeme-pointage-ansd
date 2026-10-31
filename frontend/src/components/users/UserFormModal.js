import React, { useState } from 'react';
import { Button, Field, Input, Modal, Select } from '../ui';
import { errorMessage, usersApi } from '../../services/api';

const SIMPLE_ROLE = 'Agent';
const EMPLOYEE_ROLES = ['Agent', 'Supérieur hiérarchique'];

/** Création et modification d'un utilisateur : un seul formulaire pour les deux cas. */
export default function UserFormModal({ user, roles, departments = [], onClose, onSaved }) {
  const editing = Boolean(user);
  const [form, setForm] = useState({
    matricule: user?.matricule || '',
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    password: '',
    roleId: String(roles.find((r) => r.name === user?.role)?.id || roles.find((r) => r.name === SIMPLE_ROLE)?.id || ''),
    departmentId: user?.department ? String(user.department.id) : '',
    isActive: user ? user.isActive : true,
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const roleName = roles.find((r) => String(r.id) === form.roleId)?.name;
  const simple = roleName === SIMPLE_ROLE;
  const isEmployee = EMPLOYEE_ROLES.includes(roleName);

  const validate = () => {
    const e = {};
    if (!editing && !form.matricule.trim()) e.matricule = 'Le matricule est obligatoire.';
    if (!form.nom.trim()) e.nom = 'Le nom est obligatoire.';
    if (!form.prenom.trim()) e.prenom = 'Le prénom est obligatoire.';
    if (!form.roleId) e.roleId = 'Choisissez un rôle.';
    if (!editing) {
      if (!simple && !form.email.trim()) e.email = "L'e-mail est obligatoire pour ce rôle.";
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Adresse e-mail invalide.';
      if (!simple && form.password.length < 8) e.password = 'Au moins 8 caractères.';
      if (simple && form.password && form.password.length < 8) e.password = 'Au moins 8 caractères (ou laissez vide).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      if (editing) {
        await usersApi.update(user.id, {
          nom: form.nom.trim(), prenom: form.prenom.trim(), roleId: Number(form.roleId), isActive: form.isActive,
          departmentId: isEmployee && form.departmentId ? Number(form.departmentId) : null,
        });
        onSaved({ mode: 'edit' });
      } else {
        const body = {
          matricule: form.matricule.trim(), nom: form.nom.trim(), prenom: form.prenom.trim(), roleId: Number(form.roleId),
        };
        if (isEmployee && form.departmentId) body.departmentId = Number(form.departmentId);
        if (form.email.trim()) body.email = form.email.trim();
        if (form.password) body.password = form.password;
        const res = await usersApi.create(body);
        onSaved({ mode: 'create', plainPassword: res.plainPassword, user: res.user });
      }
    } catch (err) {
      setApiError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="user-form" loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </>
      )}
    >
      <form id="user-form" onSubmit={submit} noValidate className="form-grid">
        {apiError && <p className="field-msg field-msg-error span-2" role="alert">{apiError}</p>}
        <Field label="Matricule" required error={errors.matricule} hint={editing ? 'Le matricule ne peut pas être modifié.' : undefined}>
          <Input value={form.matricule} onChange={set('matricule')} disabled={editing} data-autofocus={!editing || undefined} />
        </Field>
        <Field label="Rôle" required error={errors.roleId}>
          <Select value={form.roleId} onChange={set('roleId')}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        {isEmployee && (
          <Field label="Service" className="span-2" hint="Détermine l’équipe de l’agent et le supérieur qui suit ses pointages.">
            <Select value={form.departmentId} onChange={set('departmentId')}>
              <option value="">Aucun service</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Prénom" required error={errors.prenom}><Input value={form.prenom} onChange={set('prenom')} data-autofocus={editing || undefined} /></Field>
        <Field label="Nom" required error={errors.nom}><Input value={form.nom} onChange={set('nom')} /></Field>
        {!editing && (
          <>
            <Field label="E-mail" required={!simple} error={errors.email} hint={simple ? 'Facultatif : sinon <matricule>@ansd.local' : undefined} className="span-2">
              <Input type="email" value={form.email} onChange={set('email')} autoComplete="off" />
            </Field>
            <Field label="Mot de passe" required={!simple} error={errors.password}
              hint={simple ? 'Laissez vide pour en générer un automatiquement.' : '8 caractères minimum.'} className="span-2">
              <Input type="text" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </Field>
          </>
        )}
        {editing && (
          <label className="check span-2">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span>Compte actif<small>Un compte désactivé ne peut plus se connecter mais son historique est conservé.</small></span>
          </label>
        )}
      </form>
    </Modal>
  );
}
