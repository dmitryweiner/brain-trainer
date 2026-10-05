import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import qrcode from 'qrcode-generator';
import Button from '../components/common/Button';
import { formatKey, parseKey } from '../core/sync/key';
import type { SyncStatus } from '../core/sync/client';
import type { WebSync } from '../platform/web/sync';
import { ConfirmDialog } from './ConfirmDialog';
import './SyncPanel.scss';

/** QR as plain SVG rects: no innerHTML, scales crisply */
const QrCode: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { size: n + 4, path: d };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
};

function useSyncState(sync: WebSync) {
  const status = useSyncExternalStore(l => sync.client.subscribe(l), () => sync.client.current);
  // settings change rarely; re-render whenever they do
  useSyncExternalStore(
    l => sync.settings.subscribe(l),
    () => `${sync.settings.enabled}:${sync.settings.currentKey()}`,
  );
  return { status, enabled: sync.settings.enabled, key: sync.settings.currentKey() };
}

function statusText(status: SyncStatus, t: (k: string, o?: Record<string, unknown>) => string, language: string): string {
  switch (status.state) {
    case 'idle':
      return status.lastSyncedAt
        ? t('sync.status.idle', { time: new Date(status.lastSyncedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) })
        : t('sync.status.never');
    case 'syncing':
      return t('sync.status.syncing');
    case 'offline':
      return t('sync.status.offline', { count: status.pending });
    case 'error':
      return t('sync.status.error', { code: status.error });
    default:
      return t('sync.status.disabled');
  }
}

export const SyncPanel: React.FC<{ sync: WebSync }> = ({ sync }) => {
  const { t, i18n } = useTranslation();
  const { status, enabled, key } = useSyncState(sync);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const link = sync.linkFor(key);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatKey(key));
      setNotice(t('sync.copied'));
    } catch {
      setNotice(null);
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: t('app.title'), url: link }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(link).then(() => setNotice(t('sync.copied'))).catch(() => undefined);
    }
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseKey(code);
    setCodeError(!parsed);
    if (parsed && parsed !== key) setPendingKey(parsed);
  };

  return (
    <div className="sync-panel">
      <p className="sync-intro">{t('sync.intro')}</p>
      {notice && <p className="sync-notice" role="status">{notice}</p>}

      <div className="sync-card">
        <label className="sync-toggle">
          <span>{t('sync.enabled')}</span>
          <input type="checkbox" checked={enabled} onChange={e => sync.settings.setEnabled(e.target.checked)} />
        </label>
        <p className={`sync-status sync-status-${status.state}`} role="status">{statusText(status, t, i18n.language)}</p>
        {enabled && (
          <div className="sync-actions" style={{ marginTop: 12 }}>
            <Button variant="light" onClick={() => void sync.client.sync()} disabled={status.state === 'syncing'}>
              {t('sync.syncNow')}
            </Button>
          </div>
        )}
      </div>

      {enabled && (
        <div className="sync-card">
          <div>{t('sync.codeLabel')}:</div>
          <div className="sync-code" data-testid="sync-code">{formatKey(key)}</div>
          <div className="sync-qr">
            <QrCode text={link} label={t('sync.qrHint')} />
            <span>{t('sync.qrHint')}</span>
          </div>
          <div className="sync-actions" style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => void copy()}>{t('sync.copy')}</Button>
            <Button variant="secondary" onClick={() => void share()}>{t('sync.share')}</Button>
          </div>
          <p className="sync-hint">{t('sync.keepCode')}</p>
        </div>
      )}

      <form className="sync-card" onSubmit={submitCode}>
        <label htmlFor="sync-code-input">{t('sync.enterCode')}</label>
        <input
          id="sync-code-input"
          className="sync-input"
          value={code}
          onChange={e => { setCode(e.target.value); setCodeError(false); }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
        />
        {codeError && <p className="sync-error" role="alert">{t('sync.invalidCode')}</p>}
        <button type="submit" className="btn-custom btn-primary btn-full">{t('sync.connect')}</button>
      </form>

      <div className="sync-card">
        <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>{t('sync.delete')}</Button>
      </div>

      <ConfirmDialog
        open={pendingKey !== null}
        title={t('sync.connectTitle')}
        message={t('sync.connectText', { code: pendingKey ? formatKey(pendingKey) : '' })}
        confirmLabel={t('sync.connect')}
        onCancel={() => setPendingKey(null)}
        onConfirm={() => {
          const next = pendingKey!;
          setPendingKey(null);
          setCode('');
          void sync.connect(next).then(() => setNotice(t('sync.connected')));
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        danger
        title={t('sync.deleteTitle')}
        message={t('sync.deleteText')}
        confirmLabel={t('sync.delete')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void sync.client.deleteRemote()
            .then(() => {
              sync.settings.setEnabled(false);
              setNotice(t('sync.deleted'));
            })
            .catch(() => undefined);
        }}
      />
    </div>
  );
};

export default SyncPanel;
