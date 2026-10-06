import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { WebPrefs } from '../platform/web/prefs';
import './Engagement.scss';

export const SettingsPanel: React.FC<{ prefs: WebPrefs }> = ({ prefs }) => {
  const { t } = useTranslation();
  const value = useSyncExternalStore(l => prefs.subscribe(l), () => prefs.get());
  const vibrationSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  return (
    <div className="settings">
      <label className="settings-row">
        <span>🔊 {t('settings.sound')}</span>
        <input type="checkbox" checked={value.sound} onChange={e => prefs.set({ sound: e.target.checked })} />
      </label>
      <label className="settings-row">
        <span>📳 {t('settings.vibration')}</span>
        <input type="checkbox" checked={value.vibration} onChange={e => prefs.set({ vibration: e.target.checked })} />
      </label>
      {!vibrationSupported && <p className="settings-hint">{t('settings.vibrationUnsupported')}</p>}
      <p className="settings-hint">{t('settings.deviceOnly')}</p>
    </div>
  );
};

export default SettingsPanel;
