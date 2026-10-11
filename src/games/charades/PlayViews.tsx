import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Icon, type } from '../../components/ui';
import { shortTeamName } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import {
  currentActor,
  currentTeam,
  matchDecided,
  roundScores,
  roundWinners,
  turnScore,
  type CharadesAction,
  type CharadesState,
} from './engine';
import { getCategory } from './words';

type Dispatch = (action: CharadesAction) => void;

function buzz(enabled: boolean, kind: 'success' | 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}

function ScorePod({ state }: { state: CharadesState }) {
  return (
    <View style={styles.scorePod}>
      {state.settings.teams.map((t) => (
        <View key={t.id} style={styles.podItem}>
          <View style={[styles.podDot, { backgroundColor: t.color }]} />
          <Text style={styles.podName} numberOfLines={1}>
            {shortTeamName(t.name)}
          </Text>
          <Text style={styles.podScore}>{state.scores[t.id]}</Text>
        </View>
      ))}
    </View>
  );
}

function Hud({ state, extra }: { state: CharadesState; extra?: string }) {
  const team = currentTeam(state);
  return (
    <View style={styles.hud}>
      <View style={styles.hudRow}>
        <View style={[styles.avatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 20 }}>{team.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hudTeam} numberOfLines={1}>
            {team.name}
          </Text>
          <Text style={styles.hudActor} numberOfLines={1}>
            {currentActor(state)} is acting
          </Text>
        </View>
        {extra && <Text style={styles.hudMetaText}>{extra}</Text>}
      </View>
      <ScorePod state={state} />
      <Text style={[styles.hudMetaText, { marginTop: 10, textAlign: 'center' }]}>
        Round {state.round} · first to {state.settings.targetPoints}
      </Text>
    </View>
  );
}

export function HandoffView({ state, dispatch }: { state: CharadesState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const actor = currentActor(state);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hud state={state} />
      <View style={styles.handoff}>
        <Text style={type.label}>Pass the phone to</Text>
        <View style={[styles.bigAvatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 44 }}>{team.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{actor}</Text>
        <Text style={styles.handoffSub}>acting for {team.name}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 16 }]}>
          Guessers look away until the timer starts. No talking or mouthing words.
        </Text>
      </View>
      <Button label="I'm ready" size="lg" onPress={() => dispatch({ type: 'START_TURN', now: Date.now() })} />
    </ScrollView>
  );
}

function TimerRing({ secondsLeft, total, paused }: { secondsLeft: number; total: number; paused: boolean }) {
  const size = 112;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? secondsLeft / total : 0;
  const urgent = secondsLeft <= 10;
  const ringColor = paused ? colors.textDim : urgent ? colors.danger : colors.primary;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');
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
        <Text style={[styles.timerValue, urgent && !paused && { color: colors.danger }]}>
          {mm}:{ss}
        </Text>
        {paused && <Text style={styles.tickText}>Paused</Text>}
      </View>
    </View>
  );
}

export function PlayingView({
  state,
  dispatch,
  soundOn,
}: {
  state: CharadesState;
  dispatch: Dispatch;
  soundOn: boolean;
}) {
  const total = state.settings.roundSeconds;
  const [secondsLeft, setSecondsLeft] = useState(total);
  const lastWarned = useRef<number | null>(null);

  // Keep the screen on during a turn. Release only once the lock is actually held.
  useEffect(() => {
    const lock = activateKeepAwakeAsync('charades').then(
      () => true,
      () => false,
    );
    return () => {
      lock.then((held) => {
        if (held) deactivateKeepAwake('charades').catch(() => {});
      });
    };
  }, []);

  useEffect(() => {
    if (state.paused) {
      setSecondsLeft(Math.ceil(state.paused.remainingMs / 1000));
      return;
    }
    if (state.turnEndsAt == null) return;
    const endsAt = state.turnEndsAt;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 5 && left > 0 && lastWarned.current !== left) {
        lastWarned.current = left;
        buzz(soundOn, 'light');
      }
      if (left === 0) {
        buzz(soundOn, 'warning');
        dispatch({ type: 'TIME_UP' });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.turnEndsAt, state.paused, dispatch, soundOn]);

  const card = state.currentCard;
  const category = card ? getCategory(card.categoryId) : undefined;
  const paused = state.paused != null;
  const { skipPenalty } = state.settings;
  const score = turnScore(state.turnResults, skipPenalty);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hud state={state} extra={`${score} ${Math.abs(score) === 1 ? 'point' : 'points'}`} />
      <TimerRing secondsLeft={secondsLeft} total={total} paused={paused} />

      <View style={styles.wordCard}>
        {category && <Text style={[type.label, { textAlign: 'center' }]}>{category.title}</Text>}
        {paused ? (
          <View style={styles.wordCenter}>
            <Icon name="pause" size={36} color={colors.textDim} />
            <Text style={styles.pausedText}>Paused. The word is hidden until you resume.</Text>
          </View>
        ) : (
          <View style={styles.wordCenter}>
            <Text style={styles.word} adjustsFontSizeToFit numberOfLines={3}>
              {card?.word}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          disabled={paused}
          onPress={() => dispatch({ type: 'SKIP', now: Date.now() })}
          style={({ pressed }) => [styles.passBtn, { opacity: paused ? 0.4 : pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.ctaTitle}>Pass</Text>
          {skipPenalty && <Text style={styles.ctaSub}>−1 point</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
          onPress={() => dispatch({ type: paused ? 'RESUME' : 'PAUSE', now: Date.now() })}
          style={({ pressed }) => [styles.pauseBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name={paused ? 'play' : 'pause'} size={22} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={paused}
          onPress={() => {
            buzz(soundOn, 'success');
            dispatch({ type: 'GOT_IT', now: Date.now() });
          }}
          style={({ pressed }) => [styles.gotBtn, { opacity: paused ? 0.4 : pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.ctaTitle, { color: colors.onPrimary }]}>Got it</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function TurnSummaryView({ state, dispatch }: { state: CharadesState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const score = turnScore(state.turnResults, state.settings.skipPenalty);
  const { teams } = state.settings;
  const nextTeam = teams[(state.teamIndex + 1) % teams.length];
  const lastInRound = state.teamIndex === teams.length - 1;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.summaryHead}>
        <Text style={type.label}>Time&apos;s up</Text>
        <Text style={styles.summaryScore}>
          {score > 0 ? '+' : ''}
          {score} {Math.abs(score) === 1 ? 'point' : 'points'}
        </Text>
        <Text style={styles.summarySub}>
          for {team.name}, acted by {currentActor(state)}
        </Text>
      </View>
      <View style={styles.resultsCard}>
        {state.turnResults.length > 0 ? (
          <Text style={[type.label, { marginBottom: 10 }]}>Tap a word to fix a mistake</Text>
        ) : (
          <Text style={type.body}>No words this turn.</Text>
        )}
        {state.turnResults.map((r, i) => (
          <Pressable
            key={`${r.card.word}-${i}`}
            onPress={() => dispatch({ type: 'TOGGLE_RESULT', index: i })}
            style={styles.resultRow}
            accessibilityRole="button"
            accessibilityLabel={`${r.card.word}, ${r.correct ? 'guessed' : 'passed'}`}
          >
            <Icon name={r.correct ? 'check' : 'x'} size={16} color={r.correct ? colors.success : colors.textDim} />
            <Text style={[styles.resultWord, !r.correct && styles.resultSkipped]}>{r.card.word}</Text>
            <Text style={styles.resultTime}>{(r.ms / 1000).toFixed(1)}s</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <ScorePod state={state} />
      </View>
      <Button
        label={lastInRound ? `See round ${state.round} results` : `Next: ${nextTeam.name}`}
        size="lg"
        onPress={() => dispatch({ type: 'NEXT_TURN' })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

export function RoundOverView({ state, dispatch }: { state: CharadesState; dispatch: Dispatch }) {
  const { round } = state;
  const scores = roundScores(state, round);
  const winners = roundWinners(state, round);
  const tie = winners.length > 1;
  const winner = winners[0];
  const best = scores.find((s) => s.team.id === winner.id)?.score ?? 0;
  const decided = matchDecided(state);
  const leader = [...state.settings.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id])[0];
  const reachedTarget = state.scores[leader.id] >= state.settings.targetPoints;
  const pts = (n: number) => `${n} ${Math.abs(n) === 1 ? 'point' : 'points'}`;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Text style={type.label}>Round {round} complete</Text>
        {!tie && (
          <View style={[styles.bigAvatar, { backgroundColor: winner.color }]}>
            <Text style={{ fontSize: 44 }}>{winner.emoji}</Text>
          </View>
        )}
        <Text style={styles.roundHeadline}>{tie ? `Round ${round} is a tie` : `${winner.name} wins round ${round}`}</Text>
        <Text style={styles.handoffSub}>
          {tie
            ? `${winners.map((t) => shortTeamName(t.name)).join(' & ')} both scored ${pts(best)}`
            : `with ${pts(best)} this round`}
        </Text>
      </View>

      <View style={styles.resultsCard}>
        <View style={styles.roundTableHead}>
          <Text style={[type.label, { flex: 1 }]}>Team</Text>
          <Text style={[type.label, styles.roundCol]}>Round</Text>
          <Text style={[type.label, styles.roundCol]}>Total</Text>
        </View>
        {scores.map(({ team, score }) => {
          const won = !tie && team.id === winner.id;
          return (
            <View key={team.id} style={[styles.resultRow, won && styles.roundRowWon]}>
              <View style={[styles.resultMark, { backgroundColor: team.color }]}>
                <Text style={{ fontSize: 15 }}>{team.emoji}</Text>
              </View>
              <Text style={styles.resultWord} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={[styles.roundPoints, styles.roundCol]}>
                {score > 0 ? '+' : ''}
                {score}
              </Text>
              <Text style={[styles.roundTotal, styles.roundCol]}>{state.scores[team.id]}</Text>
            </View>
          );
        })}
      </View>

      {decided ? (
        <>
          <Text style={[type.body, { textAlign: 'center', marginTop: 20 }]}>
            {reachedTarget
              ? `${leader.name} reached ${state.settings.targetPoints} points.`
              : `That was the last of ${state.settings.maxRounds} rounds.`}
          </Text>
          <Button label="See final results" size="lg" onPress={() => dispatch({ type: 'END_GAME' })} style={{ marginTop: 20 }} />
        </>
      ) : (
        <>
          <Button
            label={`Play round ${round + 1}`}
            size="lg"
            onPress={() => dispatch({ type: 'NEXT_ROUND' })}
            style={{ marginTop: 28 }}
          />
          <Button
            label="End game"
            variant="secondary"
            onPress={() => dispatch({ type: 'END_GAME' })}
            style={{ marginTop: 12 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  hud: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hudTeam: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  hudActor: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13 },
  scorePod: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 18,
    rowGap: 6,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  podItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podDot: { width: 8, height: 8, borderRadius: 4 },
  podName: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
  podScore: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  hudMetaText: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 13 },
  handoff: { alignItems: 'center', paddingVertical: 28 },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  handoffName: { fontFamily: fonts.display, color: colors.text, fontSize: 32, marginTop: 16, textAlign: 'center' },
  handoffSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, marginTop: 4, textAlign: 'center' },
  timerWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  timerCenter: { position: 'absolute', alignItems: 'center' },
  timerValue: { fontFamily: fonts.display, color: colors.text, fontSize: 32 },
  tickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  wordCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    minHeight: 220,
  },
  wordCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  word: { fontFamily: fonts.display, color: colors.text, fontSize: 44, lineHeight: 50, textAlign: 'center' },
  pausedText: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
  passBtn: {
    flex: 1,
    height: 64,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotBtn: {
    flex: 1.1,
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 18 },
  ctaSub: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12 },
  summaryHead: { alignItems: 'center', paddingVertical: 16 },
  summaryScore: { fontFamily: fonts.display, color: colors.text, fontSize: 48, marginTop: 8 },
  summarySub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  resultsCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginTop: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceLow,
  },
  resultMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultWord: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  resultSkipped: { color: colors.textDim, textDecorationLine: 'line-through' },
  resultTime: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12 },
  roundHeadline: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 16,
    textAlign: 'center',
  },
  roundTableHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 10 },
  roundCol: { width: 52, textAlign: 'right' },
  roundRowWon: { borderColor: colors.primary },
  roundPoints: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 16 },
  roundTotal: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
});
