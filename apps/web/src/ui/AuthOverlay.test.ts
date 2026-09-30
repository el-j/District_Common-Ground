// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { login, register } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));
vi.mock('../api/endpoints/auth', () => ({ login, register }));

const { setToken } = vi.hoisted(() => ({ setToken: vi.fn() }));
const { rememberOfflineChoice } = vi.hoisted(() => ({ rememberOfflineChoice: vi.fn() }));
vi.mock('../core/state/persistence', () => ({ setToken, rememberOfflineChoice, clearOfflineChoice: vi.fn() }));

import { AuthOverlay } from './AuthOverlay';
import { ApiError } from '../api/client';

function fillForm(root: HTMLElement, email: string, password: string) {
  const form = root.querySelector<HTMLFormElement>('.auth-form')!;
  (form.querySelector('[name=email]') as HTMLInputElement).value = email;
  (form.querySelector('[name=password]') as HTMLInputElement).value = password;
}

function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('AuthOverlay', () => {
  beforeEach(() => {
    login.mockReset();
    register.mockReset();
    setToken.mockReset();
    document.body.innerHTML = '';
  });

  it('rejects an invalid email without calling the API', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onDone = vi.fn();
    new AuthOverlay(root, onDone);

    fillForm(root, 'not-an-email', 'longenough');
    root.querySelector<HTMLFormElement>('.auth-form')!
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flushMicrotasks();

    expect(login).not.toHaveBeenCalled();
    const error = root.querySelector<HTMLElement>('.auth-error')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/valid email/i);
  });

  it('rejects a too-short password without calling the API', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new AuthOverlay(root, vi.fn());

    fillForm(root, 'player@example.com', 'short');
    root.querySelector<HTMLFormElement>('.auth-form')!
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flushMicrotasks();

    expect(login).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLElement>('.auth-error')!.textContent).toMatch(/8 characters/i);
  });

  it('logs in, stores the token, and dismisses on success', async () => {
    login.mockResolvedValueOnce({ token: 'tok-123', userId: 'u1' });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onDone = vi.fn();
    new AuthOverlay(root, onDone);

    fillForm(root, 'player@example.com', 'longenough');
    root.querySelector<HTMLFormElement>('.auth-form')!
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flushMicrotasks();

    expect(login).toHaveBeenCalledWith('player@example.com', 'longenough');
    expect(setToken).toHaveBeenCalledWith('tok-123');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.auth-overlay')).toBeNull();
  });

  it('shows a friendly message for a 409 register conflict and does not dismiss', async () => {
    register.mockRejectedValueOnce(new ApiError(409, 'conflict'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onDone = vi.fn();
    new AuthOverlay(root, onDone);

    fillForm(root, 'player@example.com', 'longenough');
    root.querySelector<HTMLButtonElement>('[data-action=register]')!.click();
    await flushMicrotasks();

    expect(root.querySelector<HTMLElement>('.auth-error')!.textContent).toMatch(/already registered/i);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('at boot it is a title screen: Play first, sign-in tucked away', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new AuthOverlay(root, vi.fn());
    expect(root.querySelector('.auth-overlay--title')).not.toBeNull();
    expect(root.querySelector('.auth-play')!.textContent).toMatch(/Play/);
    const signin = root.querySelector<HTMLDetailsElement>('details.auth-signin')!;
    expect(signin.open).toBe(false);
    expect(signin.querySelector('.auth-form')).not.toBeNull();
    expect(root.querySelectorAll('.title-building').length).toBeGreaterThan(5);
  });

  it('as a later sign-in prompt it shows the form straight away', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new AuthOverlay(root, vi.fn(), 'Not now');
    expect(root.querySelector('.auth-overlay--title')).toBeNull();
    expect(root.querySelector('details.auth-signin')).toBeNull();
    expect(root.querySelector('.auth-offline')!.textContent).toBe('Not now');
  });

  it('dismisses immediately via the offline button without calling the API', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onDone = vi.fn();
    new AuthOverlay(root, onDone);

    root.querySelector<HTMLButtonElement>('.auth-offline')!.click();

    expect(login).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.auth-overlay')).toBeNull();
    // remembered, so the sign-in wall doesn't block every launch (audit §3.6)
    expect(rememberOfflineChoice).toHaveBeenCalled();
  });
});
