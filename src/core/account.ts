/**
 * Optional accounts. Playing never needs one: the name and avatar live on the
 * phone (see store.ts) and an account only backs them up so they follow the
 * player to another phone.
 */
import { useSyncExternalStore } from 'react';
import { appActions, getProfile, type Profile } from './store';
import { supabase } from './supabase';

export interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AccountState {
  /** False when this build has no Supabase keys, so accounts are switched off. */
  configured: boolean;
  /** True once the saved session (if any) has been read. */
  ready: boolean;
  user: AccountUser | null;
}

let state: AccountState = { configured: !!supabase, ready: !supabase, user: null };
const listeners = new Set<() => void>();

function set(next: Partial<AccountState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount<T>(select: (s: AccountState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

type Result = { error?: string };

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');

/** Bring the profile saved in the account onto this phone, or save this phone's profile if the account has none. */
async function syncProfile(userId: string) {
  if (!supabase) return;
  const { data } = await supabase.from('profiles').select('display_name, avatar').eq('id', userId).maybeSingle();
  const local = getProfile();
  if (data && data.display_name && data.display_name !== 'Player') {
    appActions.setProfile({ displayName: data.display_name, avatar: data.avatar ?? local.avatar });
  } else if (local.displayName) {
    await pushProfile(userId, local);
  }
}

async function pushProfile(userId: string, profile: Profile) {
  if (!supabase) return { error: undefined };
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: profile.displayName || 'Player',
    avatar: profile.avatar,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message };
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    const user = u ? { id: u.id, email: u.email ?? '', createdAt: u.created_at } : null;
    set({ user, ready: true });
    // Supabase warns against awaiting other calls inside this callback.
    if (user && event === 'SIGNED_IN') setTimeout(() => syncProfile(user.id).catch(() => {}), 0);
  });
}

export const accountActions = {
  async signUp(email: string, password: string, displayName: string): Promise<Result & { needsConfirmation?: boolean }> {
    if (!supabase) return { error: 'Accounts are not set up in this build.' };
    try {
      const name = displayName.trim();
      if (name) appActions.setProfile({ ...getProfile(), displayName: name });
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name || 'Player', avatar: getProfile().avatar } },
      });
      if (error) return { error: error.message };
      // New Supabase projects confirm email first, so there is no session yet.
      return { needsConfirmation: !data.session };
    } catch (e) {
      return { error: message(e) };
    }
  },

  async signIn(email: string, password: string): Promise<Result> {
    if (!supabase) return { error: 'Accounts are not set up in this build.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: error?.message };
    } catch (e) {
      return { error: message(e) };
    }
  },

  async signOut(): Promise<Result> {
    if (!supabase) return {};
    const { error } = await supabase.auth.signOut();
    return { error: error?.message };
  },

  /** Save the name and avatar on the phone, and to the account when signed in. */
  async saveProfile(profile: Profile): Promise<Result> {
    appActions.setProfile(profile);
    if (!state.user) return {};
    try {
      return await pushProfile(state.user.id, profile);
    } catch (e) {
      return { error: message(e) };
    }
  },

  /**
   * Permanently delete the account and its profile (the `delete_account`
   * database function in supabase/migrations). Game history on this phone stays.
   */
  async deleteAccount(): Promise<Result> {
    if (!supabase || !state.user) return { error: 'You are not signed in.' };
    try {
      const { error } = await supabase.rpc('delete_account');
      if (error) return { error: error.message };
      // The user no longer exists on the server, so just clear the local session.
      await supabase.auth.signOut({ scope: 'local' });
      set({ user: null });
      appActions.resetProfile();
      return {};
    } catch (e) {
      return { error: message(e) };
    }
  },
};
