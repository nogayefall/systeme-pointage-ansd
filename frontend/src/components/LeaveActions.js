import React from 'react';
import { Button } from './ui';

export default function LeaveActions({ leave, onApprove, onReject, busy }) {
  return (
    <div className="leave-item-actions">
      <Button size="sm" variant="success" icon="check" disabled={busy} onClick={() => onApprove(leave)}>Approuver</Button>
      <Button size="sm" icon="x" disabled={busy} onClick={() => onReject(leave)}>Refuser</Button>
    </div>
  );
}
