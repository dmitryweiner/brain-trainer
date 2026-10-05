import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../components/common/Button';
import './ConfirmDialog.scss';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces window.confirm: works in WebViews and matches the app's look. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel, danger = false, onConfirm, onCancel,
}) => {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        <div id="confirm-message" className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <div ref={cancelRef}>
            <Button variant="light" fullWidth onClick={onCancel}>{t('dialog.cancel')}</Button>
          </div>
          <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>
            {confirmLabel ?? t('dialog.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
