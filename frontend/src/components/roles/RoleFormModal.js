import React, { useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '../ui';
import { errorMessage, rolesApi } from '../../services/api';
import { getPermissionDisplay, PERMISSION_GROUPS } from '../../features/roles/permissionLabels';

/** Création / modification d'un rôle et de ses permissions dans un seul formulaire. */
export default function RoleFormModal({ role, permissions, systemRole, onClose, onSaved }) {
  const editing = Boolean(role);
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selected, setSelected] = useState(new Set((role?.permissions || []).map((p) => p.id)));
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const permissionsByGroup = permissions.reduce((groups, permission) => {
    const { group } = getPermissionDisplay(permission.name);
    if (!groups[group]) groups[group] = [];
    groups[group].push(permission);
    return groups;
  }, {});
  const groupNames = [
    ...PERMISSION_GROUPS.filter((group) => permissionsByGroup[group]?.length),
    ...Object.keys(permissionsByGroup).filter((group) => !PERMISSION_GROUPS.includes(group)),
  ];

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleGroup = (groupPermissions) => setSelected((current) => {
    const next = new Set(current);
    const shouldSelect = !groupPermissions.every((permission) => current.has(permission.id));
    groupPermissions.forEach(({ id }) => {
      if (shouldSelect) next.add(id);
      else next.delete(id);
    });
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
    <Modal className="modal-role-form" size="lg" title={editing ? `Modifier le rôle « ${role.name} »` : 'Nouveau rôle'} onClose={onClose}
      footer={(
        <>
          <span className="role-form-count" aria-live="polite">
            {selected.size} permission{selected.size === 1 ? ' sélectionnée' : 's sélectionnées'}
          </span>
          <div className="role-form-actions">
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" type="submit" form="role-form" loading={saving}>{editing ? 'Enregistrer' : 'Créer le rôle'}</Button>
          </div>
        </>
      )}>
      <form id="role-form" onSubmit={submit} noValidate className="role-form">
        {error && <p className="field-msg field-msg-error" role="alert">{error}</p>}
        <Field label="Nom du rôle" required error={nameError} hint={systemRole ? 'Le nom d’un rôle système ne peut pas être modifié.' : undefined}>
          <Input className={systemRole ? 'role-name-readonly' : undefined} value={name} onChange={(e) => setName(e.target.value)} readOnly={systemRole} data-autofocus />
        </Field>
        <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="role-form-permissions">
          <h3 className="role-form-section-title">Permissions</h3>
          {groupNames.map((group) => {
            const groupPermissions = permissionsByGroup[group];
            const allSelected = groupPermissions.every((permission) => selected.has(permission.id));
            return (
              <section className="role-permission-group" key={group} aria-labelledby={`permission-group-${group}`}>
                <div className="role-permission-group-head">
                  <h4 id={`permission-group-${group}`}>{group}</h4>
                  <button type="button" className="role-permission-toggle" onClick={() => toggleGroup(groupPermissions)}>
                    Tout {allSelected ? 'décocher' : 'cocher'}
                  </button>
                </div>
                <div className="role-permission-grid">
                  {groupPermissions.map((permission) => {
                    const display = getPermissionDisplay(permission.name);
                    return (
                      <label key={permission.id} className={`role-permission-card${selected.has(permission.id) ? ' is-selected' : ''}`}>
                        <input type="checkbox" checked={selected.has(permission.id)} onChange={() => toggle(permission.id)} />
                        <span className="role-permission-card-text">
                          <strong>{display.label}</strong>
                          {display.description && <small>{display.description}</small>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
