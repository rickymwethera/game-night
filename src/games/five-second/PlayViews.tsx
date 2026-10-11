import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Icon, Pill, type } from '../../components/ui';
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
import { getPack } from './packs';

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
      <Text style={styles.getReadyLabel}>GET READY, {player.name.toUpperCase()}</Text>
      <Text style={[styles.getReadyCount, { color: player.color }]}>{count}</Text>
    </View>
  );
}

function Scoreboard({ state }: { state: FiveState }) {
  return (
    <View style={styles.scoreboard}>
      {standings(state).map(({ player, score }) => (
        <View key={player.id} style={styles.scoreChip}>
          <Text style={{ fontSize: 14 }}>{player.emoji}</Text>
          <Text style={styles.scoreName} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.scoreValue, { color: player.color }]}>{score}</Text>
        </View>
      ))}
    </View>
  );
}

export function HandoffView({ state, dispatch, soundOn }: { state: FiveState; dispatch: Dispatch; soundOn: boolean }) {
  const player = turnPlayer(state);
  const { players, rounds, seconds } = state.settings;
  const ready = useGetReady(() => dispatch({ type: 'START_TURN', now: Date.now() }), soundOn);

  if (ready.count != null) return <GetReady count={ready.count} player={player} />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Pill label="PASS THE PHONE" icon="smartphone" bg="#3A2F55" fg={colors.primary} style={{ alignSelf: 'center' }} />
        <View style={[styles.bigAvatar, { backgroundColor: player.color, shadowColor: player.color }]}>
          <Text style={{ fontSize: 56 }}>{player.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{player.name}</Text>
        <Text style={styles.handoffSub}>
          Round {state.round} of {rounds} • Turn {state.playerIndex + 1} of {players.length}
        </Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
          Hold the phone up so everyone sees the category. Everyone else taps once for each good answer.
        </Text>
      </View>
      <Button label={`I'M READY • ${seconds} SECONDS`} size="lg" onPress={ready.start} />
      <View style={styles.tip}>
        <Icon name="zap" size={18} color={colors.coral} />
        <Text style={[type.body, { flex: 1, color: colors.text }]}>
          <Text style={{ fontFamily: fonts.bold }}>Name {ANSWERS_NEEDED}: </Text>
          Answers have to make sense. No repeats, and "umm" doesn't count!
        </Text>
      </View>
      <Text style={[type.label, { marginTop: 24, marginBottom: 10 }]}>Scoreboard</Text>
      <Scoreboard state={state} />
      {state.history.length > 0 && (
        <Button
          label="End the game here"
          icon="flag"
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
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? msLeft / total : 0;
  const urgent = msLeft <= 2000;
  const ringColor = urgent ? colors.pinkStrong : colors.coral;
  return (
    <View style={styles.timerWrap}>
      <View style={[styles.timerGlow, { shadowColor: ringColor, backgroundColor: ringColor + '22' }]} />
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
        <Text style={[styles.timerValue, urgent && { color: colors.pink }]}>{(msLeft / 1000).toFixed(1)}</Text>
      </View>
    </View>
  );
}

export function PlayingView({ state, dispatch, soundOn }: { state: FiveState; dispatch: Dispatch; soundOn: boolean }) {
  const player = responder(state);
  const total = state.settings.seconds * 1000;
  const [msLeft, setMsLeft] = useState(total);
  const lastWarned = useRef<number | null>(null);
  const pack = state.prompt ? getPack(state.prompt.packId) : undefined;

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
          <Text style={{ fontSize: 22 }}>{player.emoji}</Text>
        </View>
        <Text style={[styles.playerBarName, { color: player.color }]} numberOfLines={1}>
          {player.name.toUpperCase()}
        </Text>
        {state.stealing && <Pill label="STEAL!" icon="zap" bg={colors.pinkStrong} fg="#3D0020" />}
      </View>

      <TimerRing msLeft={msLeft} total={total} />

      <View style={styles.promptCard}>
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={styles.sheen} />
        {pack && <Pill label={`${pack.emoji}  ${pack.title.toUpperCase()}`} bg={colors.surfaceHigh} fg={colors.coral} />}
        <Text style={styles.nameLabel}>NAME {ANSWERS_NEEDED}</Text>
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
        <LinearGradient colors={['#B794FF', '#A078FF']} style={styles.tapInner}>
          <View style={styles.dots}>
            {Array.from({ length: ANSWERS_NEEDED }, (_, i) => (
              <View key={i} style={[styles.dot, i < state.count && styles.dotOn]}>
                {i < state.count && <Icon name="check" size={20} color={colors.primary} />}
              </View>
            ))}
          </View>
          <Text style={styles.tapText}>TAP FOR EACH ANSWER</Text>
        </LinearGradient>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'UNTALLY' })}
        disabled={state.count === 0}
        hitSlop={8}
        style={[styles.undo, { opacity: state.count === 0 ? 0.35 : 1 }]}
      >
        <Icon name="corner-up-left" size={14} color={colors.textMuted} />
        <Text style={styles.undoText}>Undo a tap</Text>
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Pill
          label={last.success ? (last.steal ? 'STOLEN!' : 'NAILED IT') : last.count === 0 ? 'BRAIN FREEZE' : "TIME'S UP"}
          icon={last.success ? 'check-circle' : 'clock'}
          bg={last.success ? colors.primaryStrong : colors.orange}
          fg={last.success ? '#1A0050' : '#FFE4D8'}
          style={{ alignSelf: 'center' }}
        />
        <Text style={[styles.verdictBig, { color: last.success ? colors.primary : colors.coral }]}>
          {last.success ? '+1 PT' : `${last.count}/${ANSWERS_NEEDED}`}
        </Text>
        <Text style={styles.handoffSub}>
          {last.success ? (
            <>
              <Text style={{ color: player.color }}>{player.name}</Text>
              {last.ms != null ? ` did it in ${(last.ms / 1000).toFixed(1)}s` : ' gets the point'}
            </>
          ) : (
            <>
              <Text style={{ color: player.color }}>{player.name}</Text> ran out of time
            </>
          )}
        </Text>
      </View>

      <View style={styles.recap}>
        <Text style={type.label}>Name {ANSWERS_NEEDED}</Text>
        <Text style={styles.recapPrompt}>{state.prompt?.text}</Text>
      </View>

      <Button
        label={last.success ? "Didn't count? Take the point back" : `Got ${ANSWERS_NEEDED}? Give ${player.name} the point`}
        icon={last.success ? 'x-circle' : 'check-circle'}
        variant="ghost"
        size="sm"
        onPress={() => dispatch({ type: 'JUDGE', success: !last.success })}
        style={{ marginTop: 8 }}
      />

      {stealable ? (
        <>
          <Button
            label={`STEAL! ${thief.name.toUpperCase()}, GO`}
            icon="zap"
            variant="pink"
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
          label={next ? `NEXT: ${next.name.toUpperCase()}` : 'SEE WHO WON 🏆'}
          iconRight={next ? 'arrow-right' : undefined}
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
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  handoffName: { fontFamily: fonts.display, color: colors.text, fontSize: 40, marginTop: 20, textAlign: 'center', letterSpacing: -0.8 },
  handoffSub: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 16, marginTop: 2, textAlign: 'center' },
  tip: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
  },
  scoreboard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  scoreName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13, flexShrink: 1 },
  scoreValue: { fontFamily: fonts.display, fontSize: 16 },
  getReady: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  getReadyLabel: { ...type.label, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  getReadyCount: { fontFamily: fonts.display, fontSize: 160, lineHeight: 180, marginTop: 8 },
  playPage: { flex: 1, padding: 20, paddingBottom: 28 },
  playerBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  playerBarName: { flex: 1, fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: 0.8 },
  timerWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  timerGlow: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    shadowOpacity: 0.7,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  timerCenter: { position: 'absolute', alignItems: 'center' },
  timerValue: { fontFamily: fonts.display, color: colors.text, fontSize: 40, letterSpacing: -1 },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 22,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  nameLabel: { ...type.label, color: colors.pink, fontSize: 13, letterSpacing: 2.4, marginTop: 16 },
  prompt: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  tapZone: { flex: 1, minHeight: 140, marginTop: 16 },
  tapInner: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  dots: { flexDirection: 'row', gap: 16 },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2A0066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: '#1A0050', borderColor: '#1A0050' },
  tapText: { fontFamily: fonts.display, color: '#1A0050', fontSize: 20, letterSpacing: 0.6 },
  undo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  undoText: { fontFamily: fonts.bold, color: colors.textMuted, fontSize: 13 },
  verdictBig: { fontFamily: fonts.display, fontSize: 72, letterSpacing: -2, marginTop: 14 },
  recap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, alignItems: 'center', gap: 6 },
  recapPrompt: { fontFamily: fonts.display, color: colors.text, fontSize: 22, textAlign: 'center' },
});
