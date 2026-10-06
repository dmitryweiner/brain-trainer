import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppBanner } from './AppBanner';
import type { PwaControl, PwaState } from '../platform/web/pwa';

function fakePwa(initial: Partial<PwaState> = {}) {
  let state: PwaState = { updateReady: false, offlineReady: false, canInstall: false, ...initial };
  const listeners = new Set<() => void>();
  const control: PwaControl = {
    get: () => state,
    subscribe: l => (listeners.add(l), () => listeners.delete(l)),
    update: vi.fn(async () => undefined),
    install: vi.fn(async () => undefined),
    dismissOffline: vi.fn(() => set({ offlineReady: false })),
  };
  const set = (patch: Partial<PwaState>) => {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
  };
  return { control, set };
}

describe('AppBanner', () => {
  beforeEach(() => localStorage.clear());

  it('shows nothing by default', () => {
    const { container } = render(<AppBanner pwa={fakePwa().control} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the new version first and applies it', async () => {
    const { control } = fakePwa({ updateReady: true, canInstall: true, offlineReady: true });
    render(<AppBanner pwa={control} />);
    expect(screen.getByRole('status')).toHaveTextContent('Доступна новая версия');
    await userEvent.click(screen.getByRole('button', { name: 'Обновить' }));
    expect(control.update).toHaveBeenCalled();
  });

  it('offers installation and remembers "not now"', async () => {
    const { control } = fakePwa({ canInstall: true });
    const { unmount } = render(<AppBanner pwa={control} />);
    await userEvent.click(screen.getByRole('button', { name: 'Установить' }));
    expect(control.install).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Не сейчас' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();
    render(<AppBanner pwa={control} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reacts to state changes and lets the offline notice be dismissed', async () => {
    const { control, set } = fakePwa();
    render(<AppBanner pwa={control} />);
    act(() => set({ offlineReady: true }));
    expect(screen.getByRole('status')).toHaveTextContent('без интернета');
    await userEvent.click(screen.getByRole('button', { name: 'Хорошо' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
