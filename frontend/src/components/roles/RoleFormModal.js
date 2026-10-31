import React, { useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '../ui';
import { errorMessage, rolesApi } from '../../services/api';

/** Création / modification d'un rôle et de ses permissions dans un seul formulaire. */
export default function RoleFormModal({ role, permissions, systemRole, onClose, onSaved }) {
  const editing = Boolean(role);
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selected, setSelected] = useState(new Set((role?.permissions || []).map((p) => p.id)));
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Le nom du rôle est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      let id = role?.id;
      if (editing) {
        await rolesApi.update(id, { name: name.trim(), description: description.trim() });
      } else {
        const res = await rolesApi.create({ name: name.trim(), description: description.trim() });
        id = res.role?.id ?? res.data?.id ?? res.id;
      }
      if (id) await rolesApi.setPermissions(id, [...selected]);
      onSaved(editing ? 'edit' : 'create');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" title={editing ? `Modifier le rôle « ${role.name} »` : 'Nouveau rôle'} onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="role-form" loading={saving}>{editing ? 'Enregistrer' : 'Créer le rôle'}</Button>
        </>
      )}>
      <form id="role-form" onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
        {error && <p className="field-msg field-msg-error" role="alert">{error}</p>}
        <Field label="Nom du rôle" required error={nameError} hint={systemRole ? 'Le nom d’un rôle système ne peut pas être modifié.' : undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={systemRole} data-autofocus />
        </Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div>
          <strong>Permissions</strong>
          <div className="perm-grid" style={{ marginTop: 8 }}>
            {permissions.map((p) => (
              <label key={p.id} className="check">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span>{p.name}<small>{p.description}</small></span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
