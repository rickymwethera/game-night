/**
 * The live link between the host's phone and a TV, over a Supabase Realtime
 * broadcast channel named after the TV's room code. Nothing is stored: the
 * phone sends the current game state whenever it changes, and again whenever
 * the TV says hello (on load, or after a reconnect).
 *
 * Messages on the channel:
 *   show  phone -> TV  { screen, sentAt }  what to draw
 *   bye   phone -> TV  the host left the game, go back to the code screen
 *   ping  phone -> TV  is anyone there?
 *   hello TV -> phone  yes, send me the current screen
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { parseTvShowMessage, tvChannelName, type TvScreen, type TvShowMessage } from './tvLink';

/** TV mode needs the Supabase keys, like accounts do. */
export const tvAvailable = !!supabase;

/** off: not linked. waiting: in the room, no TV has answered yet. live: a TV is showing the game. */
export type TvSenderStatus = 'off' | 'waiting' | 'live' | 'error';

/** Upcoming questions stay on the phone; the TV only needs what's on screen. */
function forTv(screen: TvScreen): TvScreen {
  return screen.state ? { ...screen, state: { ...screen.state, deck: [] } } : screen;
}

function broadcast(channel: RealtimeChannel, event: string, payload: object = {}) {
  channel.send({ type: 'broadcast', event, payload }).catch(() => {});
}

/** Phone side. Call `link(code)` with the code the TV shows; every change to `screen` is then sent to it. */
export function useTvSender(screen: TvScreen) {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<TvSenderStatus>('off');
  const channel = useRef<RealtimeChannel | null>(null);
  const latest = useRef(screen);
  latest.current = screen;

  const show = useCallback(() => {
    if (channel.current) broadcast(channel.current, 'show', { screen: forTv(latest.current), sentAt: Date.now() });
  }, []);

  useEffect(() => {
    if (!supabase || !code) return;
    const client = supabase;
    const ch = client.channel(tvChannelName(code), { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'hello' }, () => {
      setStatus('live');
      show();
    });
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        channel.current = ch;
        setStatus((prev) => (prev === 'live' ? prev : 'waiting'));
        broadcast(ch, 'ping');
        show();
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('error');
      }
    });
    return () => {
      broadcast(ch, 'bye');
      channel.current = null;
      client.removeChannel(ch);
    };
  }, [code, show]);

  useEffect(show, [screen, show]);

  const link = useCallback((next: string) => {
    setStatus('waiting');
    setCode(next);
  }, []);
  const unlink = useCallback(() => {
    setStatus('off');
    setCode(null);
  }, []);

  return { code, status, link, unlink };
}

export interface TvReceived extends TvShowMessage {
  receivedAt: number;
}

/** TV side. Joins the room for `code` and returns the latest screen the phone sent, or null before one arrives. */
export function useTvReceiver(code: string) {
  const [received, setReceived] = useState<TvReceived | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    setReceived(null);
    const ch = client.channel(tvChannelName(code), { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'show' }, ({ payload }) => {
      const message = parseTvShowMessage(payload);
      if (message) setReceived({ ...message, receivedAt: Date.now() });
    });
    ch.on('broadcast', { event: 'bye' }, () => setReceived(null));
    ch.on('broadcast', { event: 'ping' }, () => broadcast(ch, 'hello'));
    ch.subscribe((s) => {
      setConnected(s === 'SUBSCRIBED');
      if (s === 'SUBSCRIBED') broadcast(ch, 'hello');
    });
    return () => {
      client.removeChannel(ch);
    };
  }, [code]);

  return { received, connected };
}
