import React, { useState } from 'react';
import { Button, Modal } from '../ui';

/** Affiche un mot de passe généré, une seule fois. */
export default function SecretModal({ title, intro, identifier, password, onClose }) {
  const [copyStatus, setCopyStatus] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);

  const copyPassword = async () => {
    setCopyStatus('');
    setCopyFailed(false);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('La copie dans le presse-papiers n’est pas disponible dans ce navigateur.');
      }
      await navigator.clipboard.writeText(password);
      setCopyStatus('Mot de passe copié.');
    } catch (error) {
      setCopyStatus(error instanceof Error ? error.message : 'Impossible de copier le mot de passe.');
      setCopyFailed(true);
    }
  };

  return (
    <Modal className="secret-modal" title={title} onClose={onClose} size="sm" dismissible={false}
      footer={(
        <div className="secret-modal-actions">
          <Button onClick={copyPassword}>Copier</Button>
          <Button variant="primary" onClick={onClose} data-autofocus>J'ai noté le mot de passe</Button>
        </div>
      )}>
      <p>{intro}</p>
      <div className="secret-box" style={{ margin: '16px 0' }}>
        <div className="muted">{identifier}</div>
        <code>{password}</code>
      </div>
      {copyStatus && (
        <p className={`secret-copy-status${copyFailed ? ' is-error' : ''}`} role={copyFailed ? 'alert' : 'status'}>
          {copyStatus}
        </p>
      )}
      <p className="muted">Ce mot de passe ne sera plus affiché. Communiquez-le à l'agent de façon sûre.</p>
    </Modal>
  );
}
