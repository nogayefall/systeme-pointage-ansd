import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-cancel" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}
