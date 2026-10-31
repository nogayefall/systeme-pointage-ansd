import React, { useMemo, useState } from 'react';
import { Avatar, Badge, Button, Modal, SearchInput } from '../ui';
import { errorMessage, servicesApi } from '../../services/api';
import { fullName } from '../../utils/formatters';

/** Choix des agents d'un service : on coche ceux qui en font partie, on décoche ceux qui le quittent. */
export default function MembersModal({ service, employees, onClose, onSaved }) {
  const [selected, setSelected] = useState(
    () => new Set(employees.filter((e) => e.department?.id === service.id).map((e) => e.id))
  );
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return employees.filter((e) => !needle || `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(needle));
  }, [employees, q]);

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await servicesApi.setMembers(service.id, [...selected]);
      onSaved(selected.size);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal title={`Agents de « ${service.name} »`} onClose={onClose}
      footer={(
        <>
          <span className="muted" style={{ marginRight: 'auto', alignSelf: 'center' }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save} loading={saving}>Enregistrer</Button>
        </>
      )}>
      {error && <p className="field-msg field-msg-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      <SearchInput value={q} onChange={setQ} placeholder="Rechercher un agent…" className="members-search" />
      <div className="check-list" style={{ marginTop: 12 }}>
        {shown.length === 0 && <p className="muted" style={{ padding: 12 }}>Aucun agent trouvé.</p>}
        {shown.map((e) => (
          <label key={e.id} className="check">
            <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
            <Avatar user={e} size={30} />
            <span style={{ flex: 1 }}>
              {fullName(e)}
              <small>{e.matricule}</small>
            </span>
            {e.department && e.department.id !== service.id && <Badge>{e.department.name}</Badge>}
            {!e.department && <Badge tone="warning">Sans service</Badge>}
          </label>
        ))}
      </div>
      <p className="field-msg" style={{ marginTop: 8 }}>Un agent appartient à un seul service : le cocher ici le retire de son service actuel.</p>
    </Modal>
  );
}
