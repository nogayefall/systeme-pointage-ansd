import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Button, Icon, Modal } from '../components/ui';

const FeedbackContext = createContext(null);

/**
 * Notifications (toast) et confirmations pour toute l'application.
 *   const toast = useToast();   toast.success('Enregistré');
 *   const confirm = useConfirm();   if (await confirm({ title, message, danger: true })) …
 */
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);

  const push = useCallback((kind, message) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve });
  }), []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {dialog && (
        <Modal
          size="sm"
          title={dialog.title || 'Confirmation'}
          onClose={() => close(false)}
          footer={(
            <>
              <Button onClick={() => close(false)}>{dialog.cancelLabel || 'Annuler'}</Button>
              <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
                {dialog.confirmLabel || 'Confirmer'}
              </Button>
            </>
          )}
        >
          <p>{dialog.message}</p>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

const useCtx = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('FeedbackProvider manquant');
  return ctx;
};
export const useToast = () => useCtx().toast;
export const useConfirm = () => useCtx().confirm;
