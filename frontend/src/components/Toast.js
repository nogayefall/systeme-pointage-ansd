import React, { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'info', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast ${type}`} onClick={() => onClose && onClose()}>
      {message}
    </div>
  );
}
