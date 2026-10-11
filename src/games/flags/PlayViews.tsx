import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Pill, type } from '../../components/ui';
import { shortTeamName } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import {
  currentStreak,
  currentTeam,
  getCountry,
  getRegion,
  isLastTurn,
  type FlagsAction,
  type FlagsState,
} from './engine';
import { FLAG_IMAGES } from './flagImages';

type Dispatch = (action: FlagsAction) => void;

function buzz(enabled: boolean, kind: 'success' | 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}

function ScorePod({ state }: { state: FlagsState }) {
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

function Hud({ state }: { state: FlagsState }) {
  const team = currentTeam(state);
  const { flagsPerTurn, region, rounds } = state.settings;
  const flagNumber = Math.min(flagsPerTurn, state.turnAnswers.length + (state.phase === 'question' ? 1 : 0));
  const streak = currentStreak(state.turnAnswers);
  return (
    <View style={styles.hud}>
      <View style={styles.hudRow}>
        <View style={[styles.avatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 22 }}>{team.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hudTeam, { color: team.color }]} numberOfLines={1}>
            {team.name.toUpperCase()} ●
          </Text>
          <Text style={styles.hudSub} numberOfLines={1}>
            Flag <Text style={{ color: colors.primary }}>{flagNumber}</Text> of {flagsPerTurn} • {getRegion(region).title}
          </Text>
        </View>
        {streak >= 2 && <Pill label={`${streak} IN A ROW`} icon="zap" bg={colors.orange} fg="#FFE4D8" />}
      </View>
      {state.settings.teams.length > 1 && <ScorePod state={state} />}
      {rounds > 1 && (
        <Text style={[type.label, { textAlign: 'center', marginTop: 8 }]}>
          Round {state.round} of {rounds}
        </Text>
      )}
    </View>
  );
}

export function HandoffView({ state, dispatch }: { state: FlagsState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const { flagsPerTurn, region, answerSeconds } = state.settings;
  const solo = state.settings.teams.length === 1;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <Pill
          label={solo ? 'GET READY' : 'PASS THE PHONE'}
          icon={solo ? 'flag' : 'smartphone'}
          bg="#3A2F55"
          fg={colors.primary}
          style={{ alignSelf: 'center' }}
        />
        <View style={[styles.bigAvatar, { backgroundColor: team.color, shadowColor: team.color }]}>
          <Text style={{ fontSize: 56 }}>{team.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{team.name}</Text>
        <Text style={styles.handoffSub}>
          {flagsPerTurn} flags from <Text style={{ color: colors.coral }}>{getRegion(region).title}</Text>
        </Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
          {answerSeconds > 0
            ? `Pick the right country before the ${answerSeconds}-second timer runs out. Teammates can help, rivals stay quiet!`
            : 'No timer this game. Talk it over, then pick the right country. Rivals stay quiet!'}
        </Text>
      </View>
      {!solo && (
        <View style={{ marginBottom: 20 }}>
          <ScorePod state={state} />
        </View>
      )}
      <Button
        label="I'M READY • SHOW THE FLAG"
        size="lg"
        onPress={() => dispatch({ type: 'START_TURN', now: Date.now() })}
      />
    </ScrollView>
  );
}

function TimerBar({ endsAt, total, onTimeUp }: { endsAt: number; total: number; onTimeUp: () => void }) {
  const [msLeft, setMsLeft] = useState(total * 1000);
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setMsLeft(left);
      if (left === 0 && !fired.current) {
        fired.current = true;
        onTimeUp();
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt, onTimeUp]);

  const secondsLeft = Math.ceil(msLeft / 1000);
  const urgent = secondsLeft <= 3;
  const color = urgent ? colors.pinkStrong : colors.coral;
  return (
    <View style={styles.timerRow}>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${(msLeft / (total * 1000)) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.timerText, { color }]}>{secondsLeft}s</Text>
    </View>
  );
}

export function QuestionView({ state, dispatch, soundOn }: { state: FlagsState; dispatch: Dispatch; soundOn: boolean }) {
  const question = state.question;
  const revealed = state.phase === 'reveal';
  const last = state.turnAnswers[state.turnAnswers.length - 1];
  const turnDone = revealed && state.turnAnswers.length >= state.settings.flagsPerTurn;
  const lastWarned = useRef<number | null>(null);

  // Buzz once per answer, and tick through the last few seconds.
  useEffect(() => {
    if (revealed && last) buzz(soundOn, last.correct ? 'success' : 'warning');
  }, [revealed, last, soundOn]);

  const onTimeUp = useRef(() => dispatch({ type: 'TIME_UP', now: Date.now() })).current;
  useEffect(() => {
    if (state.endsAt == null) return;
    const endsAt = state.endsAt;
    const id = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left > 0 && left <= 3 && lastWarned.current !== left) {
        lastWarned.current = left;
        buzz(soundOn, 'light');
      }
    }, 200);
    return () => clearInterval(id);
  }, [state.endsAt, soundOn]);

  if (!question) return null;
  const answerName = getCountry(question.code).name;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hud state={state} />

      <View style={styles.flagCard}>
        <View style={styles.flagFrame}>
          <Image
            source={FLAG_IMAGES[question.code]}
            style={styles.flag}
            resizeMode="contain"
            accessibilityLabel={revealed ? `Flag of ${answerName}` : 'Mystery flag'}
          />
        </View>
      </View>

      {state.endsAt != null ? (
        <TimerBar endsAt={state.endsAt} total={state.settings.answerSeconds} onTimeUp={onTimeUp} />
      ) : revealed && last ? (
        <View style={[styles.verdict, { backgroundColor: last.correct ? '#1E3A2C' : '#3A1F24' }]}>
          <Icon name={last.correct ? 'check-circle' : last.picked ? 'x-circle' : 'clock'} size={20} color={last.correct ? colors.success : colors.danger} />
          <Text style={[styles.verdictText, { color: last.correct ? colors.success : colors.danger }]}>
            {last.correct ? 'Correct! +1 point' : last.picked ? `Not quite. It's ${answerName}.` : `Time's up! It's ${answerName}.`}
          </Text>
          <Button
            label={turnDone ? 'DONE' : 'NEXT'}
            iconRight="arrow-right"
            size="sm"
            onPress={() => dispatch({ type: 'NEXT', now: Date.now() })}
            style={styles.nextBtn}
          />
        </View>
      ) : (
        <Text style={styles.prompt}>WHICH COUNTRY IS THIS?</Text>
      )}

      <View style={styles.options}>
        {question.options.map((code) => {
          const isAnswer = code === question.code;
          const isPicked = last?.picked === code;
          const look = !revealed
            ? styles.option
            : isAnswer
              ? [styles.option, styles.optionRight]
              : isPicked
                ? [styles.option, styles.optionWrong]
                : [styles.option, styles.optionDim];
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              disabled={revealed}
              onPress={() => dispatch({ type: 'ANSWER', code, now: Date.now() })}
              style={({ pressed }) => [look, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <Text
                style={[
                  styles.optionText,
                  revealed && isAnswer && { color: '#06301A' },
                  revealed && isPicked && !isAnswer && { color: '#3D0A10' },
                ]}
                numberOfLines={2}
              >
                {getCountry(code).name}
              </Text>
              {revealed && (isAnswer || isPicked) && (
                <Icon name={isAnswer ? 'check' : 'x'} size={18} color={isAnswer ? '#06301A' : '#3D0A10'} />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function TurnOverView({ state, dispatch }: { state: FlagsState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const turn = state.history[state.history.length - 1];
  const correct = turn?.answers.filter((a) => a.correct).length ?? 0;
  const total = turn?.answers.length ?? 0;
  const { teams } = state.settings;
  const nextTeam = teams[(state.teamIndex + 1) % teams.length];
  const finished = isLastTurn(state);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.summaryHead}>
        <Pill label="TURN COMPLETE" icon="flag" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center' }} />
        <Text style={styles.summaryScore}>
          {correct}/{total}
        </Text>
        <Text style={styles.summarySub}>
          flags named by <Text style={{ color: team.color }}>{team.name}</Text>
        </Text>
      </View>
      <View style={styles.resultsCard}>
        <Text style={[type.label, { marginBottom: 10 }]}>This turn's flags</Text>
        {turn?.answers.map((a, i) => (
          <View key={`${a.code}-${i}`} style={styles.resultRow}>
            <Image source={FLAG_IMAGES[a.code]} style={styles.resultFlag} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{getCountry(a.code).name}</Text>
              {!a.correct && (
                <Text style={styles.resultMiss}>{a.picked ? `Picked ${getCountry(a.picked).name}` : 'Ran out of time'}</Text>
              )}
            </View>
            <View style={[styles.resultMark, { backgroundColor: a.correct ? colors.primary : colors.surfaceHighest }]}>
              <Icon name={a.correct ? 'check' : 'x'} size={14} color={a.correct ? colors.onPrimary : colors.coral} />
            </View>
          </View>
        ))}
      </View>
      {teams.length > 1 && (
        <View style={[styles.hud, { marginTop: 16 }]}>
          <Text style={[type.label, { marginBottom: 10 }]}>Scoreboard</Text>
          <ScorePod state={state} />
        </View>
      )}
      <Button
        label={finished ? 'SEE FINAL RESULTS 🏆' : `NEXT: ${nextTeam.name.toUpperCase()}`}
        size="lg"
        onPress={() => dispatch({ type: 'NEXT_TURN' })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  hud: { backgroundColor: colors.surfaceLow, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.surfaceHigh },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hudTeam: { fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.8 },
  hudSub: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
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
    marginTop: 10,
  },
  podItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textDim, marginHorizontal: 4 },
  podName: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 0.8 },
  podScore: { fontFamily: fonts.display, color: colors.text, fontSize: 22 },
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
  flagCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  flagFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden' },
  flag: { width: '100%', height: '100%' },
  prompt: { ...type.label, color: colors.textMuted, fontSize: 12, letterSpacing: 2, textAlign: 'center', marginVertical: 14 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  timerTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceHighest, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 5 },
  timerText: { fontFamily: fonts.display, fontSize: 20, width: 40, textAlign: 'right' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, marginVertical: 8 },
  verdictText: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
  nextBtn: { paddingHorizontal: 18 },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 52,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionRight: { backgroundColor: colors.success },
  optionWrong: { backgroundColor: colors.danger },
  optionDim: { opacity: 0.45 },
  optionText: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 18 },
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
    padding: 10,
    marginBottom: 8,
  },
  resultFlag: { width: 44, height: 33, borderRadius: 5 },
  resultName: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  resultMiss: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, marginTop: 1 },
  resultMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
