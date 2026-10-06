import React, { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { PwaControl } from '../platform/web/pwa';
import './AppBanner.scss';

const DISMISS_KEY = 'brain-trainer-install-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** One message at a time: a new version first, then the install offer, then "works offline". */
export const AppBanner: React.FC<{ pwa: PwaControl }> = ({ pwa }) => {
  const { t } = useTranslation();
  const state = useSyncExternalStore(l => pwa.subscribe(l), () => pwa.get());
  const [installDismissed, setInstallDismissed] = useState(readDismissed);

  let body: React.ReactNode = null;
  if (state.updateReady) {
    body = (
      <>
        <span>{t('pwa.updateReady')}</span>
        <button className="banner-action" onClick={() => void pwa.update()}>{t('pwa.update')}</button>
      </>
    );
  } else if (state.canInstall && !installDismissed) {
    body = (
      <>
        <span>{t('pwa.installText')}</span>
        <button className="banner-action" onClick={() => void pwa.install()}>{t('pwa.install')}</button>
        <button
          className="banner-close"
          aria-label={t('pwa.dismiss')}
          onClick={() => {
            setInstallDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              // private mode: the offer just comes back next time
            }
          }}
        >
          ×
        </button>
      </>
    );
  } else if (state.offlineReady) {
    body = (
      <>
        <span>{t('pwa.offlineReady')}</span>
        <button className="banner-action" onClick={() => pwa.dismissOffline()}>{t('pwa.ok')}</button>
      </>
    );
  }

  if (!body) return null;
  return <div className="app-banner" role="status">{body}</div>;
};

export default AppBanner;
