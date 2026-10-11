import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Icon, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import {
  ANSWERS_NEEDED,
  canSteal,
  getPlayer,
  nextUp,
  responder,
  standings,
  stealer,
  turnPlayer,
  type FiveAction,
  type FivePlayer,
  type FiveState,
} from './engine';

type Dispatch = (action: FiveAction) => void;

function buzz(enabled: boolean, kind: 'success' | 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}

/** A 3-2-1 lead-in so the player is looking before the prompt appears. */
function useGetReady(onGo: () => void, soundOn: boolean) {
  const [count, setCount] = useState<number | null>(null);
  const go = useRef(onGo);
  useEffect(() => {
    go.current = onGo;
  });
  useEffect(() => {
    if (count == null) return;
    if (count === 0) {
      setCount(null);
      go.current();
      return;
    }
    buzz(soundOn, 'light');
    const id = setTimeout(() => setCount(count - 1), 700);
    return () => clearTimeout(id);
  }, [count, soundOn]);
  return { count, start: () => setCount(3) };
}

function GetReady({ count, player }: { count: number; player: FivePlayer }) {
  return (
    <View style={styles.getReady}>
      <Text style={styles.getReadyLabel}>Get ready, {player.name}</Text>
      <Text style={styles.getReadyCount}>{count}</Text>
    </View>
  );
}

function Scoreboard({ state }: { state: FiveState }) {
  return (
    <View style={styles.scoreboard}>
      {standings(state).map(({ player, score }) => (
        <View key={player.id} style={styles.scoreRow}>
          <Text style={{ fontSize: 16 }}>{player.emoji}</Text>
          <Text style={styles.scoreName} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      ))}
    </View>
  );
}

export function HandoffView({ state, dispatch, soundOn }: { state: FiveState; dispatch: Dispatch; soundOn: boolean }) {
  const player = turnPlayer(state);
  const { players, rounds } = state.settings;
  const ready = useGetReady(() => dispatch({ type: 'START_TURN', now: Date.now() }), soundOn);

  if (ready.count != null) return <GetReady count={ready.count} player={player} />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Text style={type.label}>Pass the phone to</Text>
        <View style={[styles.bigAvatar, { backgroundColor: player.color }]}>
          <Text style={{ fontSize: 44 }}>{player.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{player.name}</Text>
        <Text style={styles.handoffSub}>
          Round {state.round} of {rounds} · turn {state.playerIndex + 1} of {players.length}
        </Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 12 }]}>
          Name {ANSWERS_NEEDED} before time runs out. Everyone else taps once per answer.
        </Text>
      </View>
      <Button label="I'm ready" size="lg" onPress={ready.start} />
      <Text style={[type.label, { marginTop: 28, marginBottom: 10 }]}>Scores</Text>
      <Scoreboard state={state} />
      {state.history.length > 0 && (
        <Button
          label="End game"
          variant="ghost"
          onPress={() => dispatch({ type: 'END_GAME' })}
          style={{ marginTop: 12 }}
        />
      )}
    </ScrollView>
  );
}

function TimerRing({ msLeft, total }: { msLeft: number; total: number }) {
  const size = 132;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? msLeft / total : 0;
  const urgent = msLeft <= 2000;
  const ringColor = urgent ? colors.danger : colors.primary;
  return (
    <View style={styles.timerWrap}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceHighest} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - progress)}
        />
      </Svg>
      <View style={styles.timerCenter}>
        <Text style={[styles.timerValue, urgent && { color: colors.danger }]}>{(msLeft / 1000).toFixed(1)}</Text>
      </View>
    </View>
  );
}

export function PlayingView({ state, dispatch, soundOn }: { state: FiveState; dispatch: Dispatch; soundOn: boolean }) {
  const player = responder(state);
  const total = state.settings.seconds * 1000;
  const [msLeft, setMsLeft] = useState(total);
  const lastWarned = useRef<number | null>(null);

  // Keep the screen on during a turn. Release only once the lock is actually held.
  useEffect(() => {
    const lock = activateKeepAwakeAsync('five-second').then(
      () => true,
      () => false,
    );
    return () => {
      lock.then((held) => {
        if (held) deactivateKeepAwake('five-second').catch(() => {});
      });
    };
  }, []);

  useEffect(() => {
    if (state.endsAt == null) return;
    const endsAt = state.endsAt;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setMsLeft(left);
      const whole = Math.ceil(left / 1000);
      if (left > 0 && lastWarned.current !== whole) {
        lastWarned.current = whole;
        buzz(soundOn, 'light');
      }
      if (left === 0) {
        buzz(soundOn, 'warning');
        dispatch({ type: 'TIME_UP' });
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state.endsAt, dispatch, soundOn]);

  return (
    <View style={styles.playPage}>
      <View style={styles.playerBar}>
        <View style={[styles.avatar, { backgroundColor: player.color }]}>
          <Text style={{ fontSize: 20 }}>{player.emoji}</Text>
        </View>
        <Text style={styles.playerBarName} numberOfLines={1}>
          {player.name}
        </Text>
        {state.stealing && <Text style={styles.stealText}>Steal</Text>}
      </View>

      <TimerRing msLeft={msLeft} total={total} />

      <View style={styles.promptCard}>
        <Text style={styles.nameLabel}>Name {ANSWERS_NEEDED}</Text>
        <Text style={styles.prompt} adjustsFontSizeToFit numberOfLines={4}>
          {state.prompt?.text}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Count an answer, ${state.count} of ${ANSWERS_NEEDED}`}
        onPress={() => {
          buzz(soundOn, state.count + 1 >= ANSWERS_NEEDED ? 'success' : 'light');
          dispatch({ type: 'TALLY', now: Date.now() });
        }}
        style={({ pressed }) => [styles.tapZone, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
      >
        <View style={styles.dots}>
          {Array.from({ length: ANSWERS_NEEDED }, (_, i) => (
            <View key={i} style={[styles.dot, i < state.count && styles.dotOn]}>
              {i < state.count && <Icon name="check" size={20} color={colors.primary} />}
            </View>
          ))}
        </View>
        <Text style={styles.tapText}>Tap for each answer</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'UNTALLY' })}
        disabled={state.count === 0}
        hitSlop={8}
        style={[styles.undo, { opacity: state.count === 0 ? 0.35 : 1 }]}
      >
        <Icon name="corner-up-left" size={14} color={colors.textDim} />
        <Text style={styles.undoText}>Undo</Text>
      </Pressable>
    </View>
  );
}

export function VerdictView({ state, dispatch, soundOn }: { state: FiveState; dispatch: Dispatch; soundOn: boolean }) {
  const last = state.attempts[state.attempts.length - 1];
  const player = getPlayer(state, last.playerId)!;
  const thief = stealer(state);
  const stealable = canSteal(state);
  const next = nextUp(state);
  const ready = useGetReady(() => dispatch({ type: 'STEAL', now: Date.now() }), soundOn);

  if (ready.count != null) return <GetReady count={ready.count} player={thief} />;

  const feedback = last.success ? colors.success : colors.danger;
  const status = last.success ? (last.steal ? 'Stolen' : 'Nailed it') : last.count === 0 ? 'Brain freeze' : "Time's up";

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Text style={[styles.status, { color: feedback }]}>{status}</Text>
        <Text style={[styles.verdictBig, { color: feedback }]}>
          {last.success ? '+1' : `${last.count}/${ANSWERS_NEEDED}`}
        </Text>
        <Text style={styles.handoffSub}>
          {last.success
            ? `${player.name}${last.ms != null ? ` did it in ${(last.ms / 1000).toFixed(1)}s` : ' gets the point'}`
            : `${player.name} ran out of time`}
        </Text>
      </View>

      <View style={styles.recap}>
        <Text style={type.label}>Name {ANSWERS_NEEDED}</Text>
        <Text style={styles.recapPrompt}>{state.prompt?.text}</Text>
      </View>

      <Button
        label={last.success ? 'Take the point back' : `Give ${player.name} the point`}
        variant="ghost"
        size="sm"
        onPress={() => dispatch({ type: 'JUDGE', success: !last.success })}
        style={{ marginTop: 8 }}
      />

      {stealable ? (
        <>
          <Button
            label={`${thief.name}, steal it`}
            size="lg"
            onPress={ready.start}
            style={{ marginTop: 20 }}
          />
          <Button
            label="No steal, next turn"
            variant="secondary"
            onPress={() => dispatch({ type: 'NEXT_TURN' })}
            style={{ marginTop: 12 }}
          />
        </>
      ) : (
        <Button
          label={next ? `Next: ${next.name}` : 'See results'}
          size="lg"
          onPress={() => dispatch({ type: 'NEXT_TURN' })}
          style={{ marginTop: 20 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  handoff: { alignItems: 'center', paddingVertical: 28 },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  handoffName: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 28, marginTop: 16, textAlign: 'center' },
  handoffSub: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14, marginTop: 4, textAlign: 'center' },
  scoreboard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  scoreName: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  scoreValue: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  getReady: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  getReadyLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  getReadyCount: { fontFamily: fonts.display, color: colors.text, fontSize: 140, lineHeight: 160, marginTop: 8 },
  playPage: { flex: 1, padding: 20, paddingBottom: 28 },
  playerBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playerBarName: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  stealText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  timerWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  timerCenter: { position: 'absolute', alignItems: 'center' },
  timerValue: { fontFamily: fonts.display, color: colors.text, fontSize: 40, letterSpacing: -1 },
  promptCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, alignItems: 'center' },
  nameLabel: { ...type.label, fontSize: 13 },
  prompt: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tapZone: {
    flex: 1,
    minHeight: 140,
    marginTop: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  dots: { flexDirection: 'row', gap: 16 },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.onPrimary },
  tapText: { fontFamily: fonts.bold, color: colors.onPrimary, fontSize: 18 },
  undo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  undoText: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 13 },
  status: { fontFamily: fonts.semibold, fontSize: 15 },
  verdictBig: { fontFamily: fonts.display, fontSize: 56, marginTop: 8 },
  recap: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, alignItems: 'center', gap: 6 },
  recapPrompt: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18, textAlign: 'center' },
});
