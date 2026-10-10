import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Icon, Pill, type } from '../../components/ui';
import { shortTeamName } from '../../core/types';
import { colors, fonts, gradients, radius } from '../../theme';
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
      {state.settings.teams.map((t, i) => (
        <View key={t.id} style={styles.podItem}>
          {i > 0 && <View style={styles.podDot} />}
          <Text style={[styles.podName, { color: t.color }]} numberOfLines={1}>
            {shortTeamName(t.name).toUpperCase()}
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
          <Text style={{ fontSize: 26 }}>{team.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hudTeam, { color: team.color }]} numberOfLines={1}>
            {team.name.toUpperCase()} ●
          </Text>
          <Text style={styles.hudActor} numberOfLines={1}>
            Actor: <Text style={{ color: colors.primary }}>{currentActor(state)}</Text>
          </Text>
        </View>
      </View>
      <ScorePod state={state} />
      <View style={styles.hudMeta}>
        <Pill label={`ROUND ${state.round}`} bg={colors.surfaceHigh} fg={colors.text} />
        <Text style={styles.hudMetaText}>First to {state.settings.targetPoints} pts</Text>
        {extra && <Text style={[styles.hudMetaText, { marginLeft: 'auto' }]}>{extra}</Text>}
      </View>
    </View>
  );
}

function PartyRule({ actor }: { actor: string }) {
  return (
    <View style={styles.partyRule}>
      <Icon name="volume-x" size={18} color={colors.coral} />
      <Text style={[type.body, { flex: 1, color: colors.text }]}>
        <Text style={{ fontFamily: fonts.bold }}>Party Rule: </Text>
        {actor} cannot speak, mouth words, or write in the air! Only teammate shouts count.
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
        <Pill label="PASS THE PHONE" icon="smartphone" bg="#3A2F55" fg={colors.primary} style={{ alignSelf: 'center' }} />
        <View style={[styles.bigAvatar, { backgroundColor: team.color, shadowColor: team.color }]}>
          <Text style={{ fontSize: 56 }}>{team.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{actor}</Text>
        <Text style={styles.handoffSub}>
          you're acting for <Text style={{ color: team.color }}>{team.name}</Text>
        </Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
          Guessers, look away until the timer starts. No peeking at the screen!
        </Text>
      </View>
      <Button
        label={`I'M READY • START ${state.settings.roundSeconds}s`}
        size="lg"
        onPress={() => dispatch({ type: 'START_TURN', now: Date.now() })}
      />
      <PartyRule actor={actor} />
    </ScrollView>
  );
}

function TimerRing({ secondsLeft, total, paused }: { secondsLeft: number; total: number; paused: boolean }) {
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? secondsLeft / total : 0;
  const urgent = secondsLeft <= 10;
  const ringColor = urgent ? colors.pinkStrong : colors.coral;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');
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
        <Text style={styles.timerValue}>
          {mm}:{ss}
        </Text>
        <View style={styles.ticking}>
          <View style={[styles.tickDot, { backgroundColor: paused ? colors.textDim : ringColor }]} />
          <Text style={[styles.tickText, { color: paused ? colors.textDim : ringColor }]}>{paused ? 'PAUSED' : 'TICKING'}</Text>
        </View>
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
  const team = currentTeam(state);
  const actor = currentActor(state);
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
  const cardNumber = state.turnResults.length + 1;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hud state={state} extra={`Card ${cardNumber} • ${turnScore(state.turnResults, skipPenalty)} pts`} />
      <TimerRing secondsLeft={secondsLeft} total={total} paused={paused} />

      <View style={styles.wordCard}>
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={styles.sheen} />
        <View style={styles.wordBadges}>
          {category && <Pill label={`${category.emoji}  ${category.title.toUpperCase()}`} bg={colors.surfaceHigh} fg={colors.coral} />}
          <Pill label="+1 PT" icon="star" bg={colors.primaryStrong} fg="#1A0050" />
        </View>
        {paused ? (
          <View style={styles.wordCenter}>
            <Icon name="pause-circle" size={44} color={colors.textDim} />
            <Text style={styles.pausedText}>Paused. The word is hidden until you resume.</Text>
          </View>
        ) : (
          <View style={styles.wordCenter}>
            <Text style={styles.actLabel}>ACT IT OUT</Text>
            <Text style={styles.word} adjustsFontSizeToFit numberOfLines={3}>
              {card?.word.toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.wordFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="tag" size={13} color={colors.textDim} />
            <Text style={styles.footerText}>{category?.tag}</Text>
          </View>
          {category && <Pill label={`Level: ${category.difficulty.toLowerCase()}`} bg={colors.surfaceHigh} fg={colors.text} />}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          disabled={paused}
          onPress={() => dispatch({ type: 'SKIP', now: Date.now() })}
          style={({ pressed }) => [styles.passBtn, { opacity: paused ? 0.4 : pressed ? 0.8 : 1 }]}
        >
          <View style={styles.ctaRow}>
            <Icon name="x" size={22} color={colors.coral} />
            <Text style={[styles.ctaTitle, { color: colors.coral }]}>PASS</Text>
          </View>
          <Text style={styles.ctaSub}>{skipPenalty ? '-1 Point Penalty' : 'No penalty'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
          onPress={() => dispatch({ type: paused ? 'RESUME' : 'PAUSE', now: Date.now() })}
          style={({ pressed }) => [styles.pauseBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name={paused ? 'play' : 'pause'} size={22} color={colors.text} />
          <Text style={styles.pauseText}>{paused ? 'GO' : 'PAUSE'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={paused}
          onPress={() => {
            buzz(soundOn, 'success');
            dispatch({ type: 'GOT_IT', now: Date.now() });
          }}
          style={({ pressed }) => [{ flex: 1.1, opacity: paused ? 0.4 : pressed ? 0.85 : 1 }]}
        >
          <LinearGradient colors={gradients.gotIt} style={styles.gotBtn}>
            <View style={styles.ctaRow}>
              <View style={styles.checkCircle}>
                <Icon name="check" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.ctaTitle, { color: '#1A0050' }]}>GOT IT!</Text>
            </View>
            <Text style={[styles.ctaSub, { color: '#2A0066' }]}>+1 Point</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <PartyRule actor={actor} />
      <Text style={[type.label, { textAlign: 'center', marginTop: 4, color: team.color }]}>{team.name} is guessing</Text>
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
        <Pill label="TIME'S UP" icon="clock" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center' }} />
        <Text style={styles.summaryScore}>
          {score > 0 ? '+' : ''}
          {score} {Math.abs(score) === 1 ? 'PT' : 'PTS'}
        </Text>
        <Text style={styles.summarySub}>
          for <Text style={{ color: team.color }}>{team.name}</Text>, acted by {currentActor(state)}
        </Text>
      </View>
      <View style={styles.resultsCard}>
        <Text style={[type.label, { marginBottom: 10 }]}>
          {state.turnResults.length > 0 ? 'Tap a word to fix a mistake' : 'No words this turn'}
        </Text>
        {state.turnResults.map((r, i) => (
          <Pressable
            key={`${r.card.word}-${i}`}
            onPress={() => dispatch({ type: 'TOGGLE_RESULT', index: i })}
            style={styles.resultRow}
            accessibilityRole="button"
          >
            <View style={[styles.resultMark, { backgroundColor: r.correct ? colors.primary : colors.surfaceHighest }]}>
              <Icon name={r.correct ? 'check' : 'x'} size={14} color={r.correct ? colors.onPrimary : colors.coral} />
            </View>
            <Text style={[styles.resultWord, !r.correct && styles.resultSkipped]}>{r.card.word}</Text>
            <Text style={styles.resultTime}>{(r.ms / 1000).toFixed(1)}s</Text>
          </Pressable>
        ))}
        {state.turnResults.length === 0 && <Text style={type.body}>Better luck next time!</Text>}
      </View>
      <View style={[styles.hud, { marginTop: 16 }]}>
        <Text style={[type.label, { marginBottom: 10 }]}>Scoreboard</Text>
        <ScorePod state={state} />
      </View>
      <Button
        label={lastInRound ? `SEE WHO WON ROUND ${state.round}` : `NEXT: ${nextTeam.name.toUpperCase()}`}
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Pill label={`ROUND ${round} COMPLETE`} icon="flag" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center' }} />
        <View
          style={[
            styles.bigAvatar,
            tie ? { backgroundColor: colors.surfaceHigh, shadowColor: colors.primaryStrong } : { backgroundColor: winner.color, shadowColor: winner.color },
          ]}
        >
          <Text style={{ fontSize: 56 }}>{tie ? '🤝' : winner.emoji}</Text>
        </View>
        <Text style={styles.roundHeadline}>
          {tie ? `ROUND ${round} IS A TIE!` : `${winner.name.toUpperCase()} WINS ROUND ${round}!`}
        </Text>
        <Text style={styles.handoffSub}>
          {tie
            ? `${winners.map((t) => shortTeamName(t.name)).join(' & ')} both scored ${best} ${Math.abs(best) === 1 ? 'point' : 'points'}`
            : `with ${best} ${Math.abs(best) === 1 ? 'point' : 'points'} this round`}
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
              <Text style={[styles.resultWord, { color: won ? team.color : colors.text }]} numberOfLines={1}>
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
          <View style={styles.partyRule}>
            <Icon name="award" size={18} color={colors.coral} />
            <Text style={[type.body, { flex: 1, color: colors.text }]}>
              {reachedTarget
                ? `${leader.name} reached ${state.settings.targetPoints} points. That's game!`
                : `That was the last of ${state.settings.maxRounds} rounds. Time to crown a champion.`}
            </Text>
          </View>
          <Button label="SEE WHO WON 🏆" size="lg" onPress={() => dispatch({ type: 'END_GAME' })} style={{ marginTop: 24 }} />
        </>
      ) : (
        <>
          <Text style={styles.askAgain}>Play another round?</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>
            First to {state.settings.targetPoints} pts wins the match.
          </Text>
          <Button
            label={`YES, PLAY ROUND ${round + 1}`}
            icon="rotate-cw"
            size="lg"
            onPress={() => dispatch({ type: 'NEXT_ROUND' })}
            style={{ marginTop: 18 }}
          />
          <Button
            label="No, end the game"
            icon="flag"
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
  hud: { backgroundColor: colors.surfaceLow, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.surfaceHigh },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hudTeam: { fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.8 },
  hudActor: { fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  scorePod: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  podItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textDim, marginHorizontal: 4 },
  podName: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 0.8 },
  podScore: { fontFamily: fonts.display, color: colors.text, fontSize: 22 },
  hudMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  hudMetaText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
  partyRule: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
  },
  handoff: { alignItems: 'center', paddingVertical: 32 },
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
  handoffSub: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 16, marginTop: 2 },
  timerWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  timerGlow: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    shadowOpacity: 0.7,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  timerCenter: { position: 'absolute', alignItems: 'center' },
  timerValue: { fontFamily: fonts.display, color: colors.text, fontSize: 32, letterSpacing: -1 },
  ticking: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -2 },
  tickDot: { width: 7, height: 7, borderRadius: 4 },
  tickText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  wordCard: {
    backgroundColor: colors.surface,
    borderRadius: 36,
    padding: 22,
    overflow: 'hidden',
    minHeight: 250,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  wordBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  wordCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  actLabel: { ...type.label, color: colors.textMuted, fontSize: 12, letterSpacing: 2 },
  word: { fontFamily: fonts.display, color: colors.text, fontSize: 46, lineHeight: 50, textAlign: 'center', marginTop: 10, letterSpacing: -1 },
  pausedText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' },
  wordFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 12 },
  controls: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  passBtn: { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 32, paddingVertical: 18, alignItems: 'center' },
  pauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { fontFamily: fonts.bold, color: colors.text, fontSize: 10, letterSpacing: 0.8, marginTop: 2 },
  gotBtn: {
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.5 },
  ctaSub: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A0050', alignItems: 'center', justifyContent: 'center' },
  summaryHead: { alignItems: 'center', paddingVertical: 16 },
  summaryScore: { fontFamily: fonts.display, color: colors.primary, fontSize: 64, letterSpacing: -2, marginTop: 10 },
  summarySub: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  resultsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginTop: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceLow,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  resultMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultWord: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  resultSkipped: { color: colors.textDim, textDecorationLine: 'line-through' },
  resultTime: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 12 },
  roundHeadline: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  roundTableHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 10 },
  roundCol: { width: 52, textAlign: 'right' },
  roundRowWon: { borderWidth: 1, borderColor: '#4A3B7A' },
  roundPoints: { fontFamily: fonts.bold, color: colors.primary, fontSize: 16 },
  roundTotal: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  askAgain: { fontFamily: fonts.display, color: colors.text, fontSize: 26, textAlign: 'center', marginTop: 28, marginBottom: 4 },
});
