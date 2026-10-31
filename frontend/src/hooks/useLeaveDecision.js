import { useState } from 'react';
import { leavesApi, errorMessage } from '../services/api';
import { useConfirm, useToast } from '../contexts/FeedbackContext';

/** Approuver / refuser une demande, avec confirmation et retour utilisateur uniformes. */
export default function useLeaveDecision(onDone) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const decide = async (leave, action) => {
    const approve = action === 'approve';
    const ok = await confirm({
      title: approve ? 'Approuver la demande' : 'Refuser la demande',
      message: `${approve ? 'Approuver' : 'Refuser'} la demande de congé de ${leave.userName} ?`,
      confirmLabel: approve ? 'Approuver' : 'Refuser',
      danger: !approve,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await (approve ? leavesApi.approve(leave.id) : leavesApi.reject(leave.id));
      toast.success(approve ? 'Demande approuvée.' : 'Demande refusée.');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return { busy, approve: (l) => decide(l, 'approve'), reject: (l) => decide(l, 'reject') };
}
