import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, type } from '../../components/ui';
import { shortTeamName } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import {
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

function Hud({ state }: { state: FlagsState }) {
  const team = currentTeam(state);
  const { flagsPerTurn, rounds } = state.settings;
  const flagNumber = Math.min(flagsPerTurn, state.turnAnswers.length + (state.phase === 'question' ? 1 : 0));
  return (
    <View style={styles.hud}>
      <View style={styles.hudRow}>
        <View style={[styles.avatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 16 }}>{team.emoji}</Text>
        </View>
        <Text style={styles.hudTeam} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.hudSub}>
          {rounds > 1 ? `Round ${state.round} · ` : ''}Flag {flagNumber} of {flagsPerTurn}
        </Text>
      </View>
      {state.settings.teams.length > 1 && <ScorePod state={state} />}
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
        <Text style={type.label}>{solo ? 'Get ready' : 'Pass the phone to'}</Text>
        <View style={[styles.bigAvatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 40 }}>{team.emoji}</Text>
        </View>
        <Text style={styles.handoffName}>{team.name}</Text>
        <Text style={styles.handoffSub}>
          {flagsPerTurn} flags · {getRegion(region).title}
          {answerSeconds > 0 ? ` · ${answerSeconds}s each` : ''}
        </Text>
      </View>
      {!solo && (
        <View style={{ marginBottom: 20 }}>
          <ScorePod state={state} />
        </View>
      )}
      <Button label="Show the flag" size="lg" onPress={() => dispatch({ type: 'START_TURN', now: Date.now() })} />
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
  const color = urgent ? colors.danger : colors.primary;
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
        <View style={styles.verdict}>
          <Icon name={last.correct ? 'check-circle' : last.picked ? 'x-circle' : 'clock'} size={20} color={last.correct ? colors.success : colors.danger} />
          <Text style={[styles.verdictText, { color: last.correct ? colors.success : colors.danger }]}>
            {last.correct ? 'Correct' : last.picked ? `It's ${answerName}` : `Time's up. It's ${answerName}`}
          </Text>
          <Button
            label={turnDone ? 'Done' : 'Next'}
            iconRight="arrow-right"
            size="sm"
            onPress={() => dispatch({ type: 'NEXT', now: Date.now() })}
            style={styles.nextBtn}
          />
        </View>
      ) : (
        <Text style={styles.prompt}>Which country is this?</Text>
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
                  revealed && isAnswer && { color: colors.surfaceLowest },
                  revealed && isPicked && !isAnswer && { color: colors.surfaceLowest },
                ]}
                numberOfLines={2}
              >
                {getCountry(code).name}
              </Text>
              {revealed && (isAnswer || isPicked) && (
                <Icon name={isAnswer ? 'check' : 'x'} size={18} color={isAnswer ? colors.surfaceLowest : colors.surfaceLowest} />
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
        <Text style={styles.summaryScore}>
          {correct}/{total}
        </Text>
        <Text style={styles.summarySub}>{team.name}</Text>
      </View>
      <View style={styles.resultsCard}>
        {turn?.answers.map((a, i) => (
          <View key={`${a.code}-${i}`} style={[styles.resultRow, i > 0 && styles.resultDivider]}>
            <Image source={FLAG_IMAGES[a.code]} style={styles.resultFlag} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{getCountry(a.code).name}</Text>
              {!a.correct && (
                <Text style={styles.resultMiss}>{a.picked ? `Picked ${getCountry(a.picked).name}` : 'Ran out of time'}</Text>
              )}
            </View>
            <Icon name={a.correct ? 'check' : 'x'} size={18} color={a.correct ? colors.success : colors.danger} />
          </View>
        ))}
      </View>
      {teams.length > 1 && (
        <View style={{ marginTop: 16 }}>
          <ScorePod state={state} />
        </View>
      )}
      <Button
        label={finished ? 'See results' : `Next: ${nextTeam.name}`}
        size="lg"
        onPress={() => dispatch({ type: 'NEXT_TURN' })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  hud: { gap: 10 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  hudTeam: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  hudSub: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 13 },
  scorePod: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  podItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podDot: { width: 8, height: 8, borderRadius: 4 },
  podName: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  podScore: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  handoff: { alignItems: 'center', paddingVertical: 32 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  handoffName: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 24, marginTop: 16, textAlign: 'center' },
  handoffSub: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14, marginTop: 4, textAlign: 'center' },
  flagCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginTop: 16 },
  flagFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden' },
  flag: { width: '100%', height: '100%' },
  prompt: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 14, textAlign: 'center', marginVertical: 14 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  timerTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceHighest, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 3 },
  timerText: { fontFamily: fonts.bold, fontSize: 16, width: 40, textAlign: 'right' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginVertical: 8 },
  verdictText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
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
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  optionRight: { backgroundColor: colors.success },
  optionWrong: { backgroundColor: colors.danger },
  optionDim: { opacity: 0.45 },
  optionText: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  summaryHead: { alignItems: 'center', paddingVertical: 16 },
  summaryScore: { fontFamily: fonts.display, color: colors.text, fontSize: 48 },
  summarySub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 2 },
  resultsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.surfaceHighest },
  resultFlag: { width: 40, height: 30, borderRadius: 4 },
  resultName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  resultMiss: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, marginTop: 1 },
});
