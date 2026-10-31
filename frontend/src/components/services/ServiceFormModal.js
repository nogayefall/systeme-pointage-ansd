import React, { useState } from 'react';
import { Button, Field, Input, Modal, Select } from '../ui';
import { errorMessage, servicesApi } from '../../services/api';
import { fullName } from '../../utils/formatters';

/** Création / modification d'un service : nom et chef de service. */
export default function ServiceFormModal({ service, supervisors, onClose, onSaved }) {
  const editing = Boolean(service);
  const [name, setName] = useState(service?.name || '');
  const [headId, setHeadId] = useState(service?.head ? String(service.head.id) : '');
  const [nameError, setNameError] = useState('');
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Le nom du service est obligatoire.'); return; }
    setSaving(true);
    setApiError('');
    const body = { name: name.trim(), headId: headId ? Number(headId) : null };
    try {
      if (editing) await servicesApi.update(service.id, body);
      else await servicesApi.create(body);
      onSaved(editing ? 'edit' : 'create');
    } catch (err) {
      setApiError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? 'Modifier le service' : 'Nouveau service'} size="sm" onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="service-form" loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </>
      )}>
      <form id="service-form" onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
        {apiError && <p className="field-msg field-msg-error" role="alert">{apiError}</p>}
        <Field label="Nom du service" required error={nameError}>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-autofocus placeholder="ex. Systèmes d'information" />
        </Field>
        <Field label="Chef de service"
          hint={supervisors.length === 0
            ? "Aucun compte « Supérieur hiérarchique » : créez-en un dans Utilisateurs pour pouvoir le choisir ici."
            : "Il suivra les pointages et les congés des agents de ce service."}>
          <Select value={headId} onChange={(e) => setHeadId(e.target.value)}>
            <option value="">Aucun pour le moment</option>
            {supervisors.map((u) => <option key={u.id} value={u.id}>{fullName(u)} ({u.matricule})</option>)}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
