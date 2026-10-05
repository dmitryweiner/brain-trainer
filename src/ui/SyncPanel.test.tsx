import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createWebServices, type AppServices } from './webServices';
import { LocalStorageStore } from '../platform/web';
import { createWebSync } from '../platform/web/sync';
import { FakeScheduler } from '../core/testing/fakeScheduler';
import { FakeSyncServer } from '../core/testing/fakeSyncServer';
import { activeSessions } from '../core/stats';
import { formatKey } from '../core/sync/key';

const OTHER_KEY = 'ZZZZYYYYXXXXWWWWVVVVTTTT';

function remoteSession(id: string) {
  return {
    kind: 'session' as const, id,
    session: {
      id, gameId: 'n-back' as const, schemaVersion: 2 as const, startedAt: Date.now() - 1000, durationMs: 1000,
      level: 1, score: 30, rating: 667, accuracy: 70, avgTimeMs: 900, metrics: {},
    },
  };
}

function setup() {
  const server = new FakeSyncServer();
  const scheduler = new FakeScheduler();
  const base = createWebServices();
  const sync = createWebSync({ repository: base.repository, scheduler, clock: base.clock, store: new LocalStorageStore(), fetch: server.fetch });
  const services: AppServices = { ...base, scheduler, sync };
  return { server, services, sync };
}

async function openSyncTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Профиль' }));
  await user.click(screen.getByRole('button', { name: 'Синхронизация' }));
}

describe('cloud sync UI', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('connects this device from another device\'s link', async () => {
    const { server, services } = setup();
    server.rows.push({ seq: ++server.seq, user: OTHER_KEY, event: remoteSession('from-phone') });
    window.location.hash = `sync=${OTHER_KEY.toLowerCase()}`;
    const user = userEvent.setup();
    render(<App services={services} />);

    expect(screen.getByRole('alertdialog')).toHaveTextContent(formatKey(OTHER_KEY));
    await user.click(screen.getByRole('button', { name: 'Подключить' }));

    await waitFor(() => expect(activeSessions(services.repository.events).map(s => s.id)).toEqual(['from-phone']));
    expect(services.sync!.settings.currentKey()).toBe(OTHER_KEY);
    expect(localStorage.getItem('brain-trainer-sync-key')).toBe(OTHER_KEY);
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('ignores a malformed link', () => {
    const { services } = setup();
    window.location.hash = 'sync=nope';
    render(<App services={services} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
  });

  it('shows the code and a QR, and validates a typed code', async () => {
    const { sync, services } = setup();
    const user = userEvent.setup();
    render(<App services={services} />);
    await openSyncTab(user);

    expect(screen.getByTestId('sync-code')).toHaveTextContent(formatKey(sync.settings.currentKey()));
    expect(screen.getAllByRole('img', { name: /Отсканируйте/ }).length).toBeGreaterThan(0);

    const input = screen.getByLabelText('Код с другого устройства');
    await user.type(input, 'abc');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('24 символа');

    await user.clear(input);
    await user.type(input, formatKey(OTHER_KEY).toLowerCase());
    await user.click(screen.getByRole('button', { name: 'Подключить' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(sync.settings.currentKey()).not.toBe(OTHER_KEY);
  });

  it('deletes the cloud copy and turns sync off', async () => {
    const { server, sync, services } = setup();
    server.rows.push({ seq: ++server.seq, user: sync.settings.currentKey(), event: remoteSession('x') });
    const user = userEvent.setup();
    render(<App services={services} />);
    await openSyncTab(user);

    await user.click(screen.getByRole('button', { name: 'Удалить данные из облака' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(dialog.querySelector('.btn-danger') as HTMLElement);

    await waitFor(() => expect(screen.getByText('Данные в облаке удалены')).toBeInTheDocument());
    expect(server.rows).toEqual([]);
    expect(sync.settings.enabled).toBe(false);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('asks before clearing the history (no window.confirm)', async () => {
    const { services } = setup();
    services.repository.addSession(remoteSession('local').session);
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(screen.getByRole('button', { name: 'Профиль' }));
    await user.click(screen.getByRole('button', { name: '🗑️' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Удалить историю?');
    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(activeSessions(services.repository.events)).toEqual([]);
  });
});
