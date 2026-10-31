import React from 'react';
import { Button, Modal } from '../ui';

/** Affiche un mot de passe généré, une seule fois. */
export default function SecretModal({ title, intro, identifier, password, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm" dismissible={false}
      footer={<Button variant="primary" onClick={onClose} data-autofocus>J'ai noté le mot de passe</Button>}>
      <p>{intro}</p>
      <div className="secret-box" style={{ margin: '16px 0' }}>
        <div className="muted">{identifier}</div>
        <code>{password}</code>
      </div>
      <p className="muted">Ce mot de passe ne sera plus affiché. Communiquez-le à l'agent de façon sûre.</p>
    </Modal>
  );
}
