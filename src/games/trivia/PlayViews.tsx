import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, type } from '../../components/ui';
import { shortTeamName } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import {
  currentStreak,
  currentTeam,
  getPack,
  getQuestion,
  isLastTurn,
  type TriviaAction,
  type TriviaState,
} from './engine';

type Dispatch = (action: TriviaAction) => void;

const LETTERS = ['A', 'B', 'C', 'D'];

function buzz(enabled: boolean, kind: 'success' | 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}

function ScorePod({ state }: { state: TriviaState }) {
  return (
    <View style={styles.scorePod}>
      {state.settings.teams.map((t, i) => (
        <View key={t.id} style={styles.podItem}>
          {i > 0 && <View style={styles.podDot} />}
          <Text style={[styles.podName, { color: t.color }]} numberOfLines={1}>
            {shortTeamName(t.name)}
          </Text>
          <Text style={styles.podScore}>{state.scores[t.id]}</Text>
        </View>
      ))}
    </View>
  );
}

function Hud({ state }: { state: TriviaState }) {
  const team = currentTeam(state);
  const { questionsPerTurn, rounds } = state.settings;
  const number = Math.min(questionsPerTurn, state.turnAnswers.length + (state.phase === 'question' ? 1 : 0));
  const streak = currentStreak(state.turnAnswers);
  return (
    <View style={styles.hud}>
      <View style={styles.hudRow}>
        <View style={[styles.avatar, { backgroundColor: team.color }]}>
          <Text style={{ fontSize: 22 }}>{team.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hudTeam, { color: team.color }]} numberOfLines={1}>
            {team.name}
          </Text>
          <Text style={styles.hudSub} numberOfLines={1}>
            Question {number} of {questionsPerTurn} · {state.scores[team.id]} pts
          </Text>
        </View>
        {streak >= 2 && <Text style={styles.streak}>{streak} in a row</Text>}
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

export function HandoffView({ state, dispatch }: { state: TriviaState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const { questionsPerTurn, answerSeconds } = state.settings;
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
          {questionsPerTurn} questions
          {answerSeconds > 0 ? ` · ${answerSeconds}s each` : ''}
          {state.settings.rounds > 1 ? ` · Round ${state.round}` : ''}
        </Text>
      </View>
      {!solo && (
        <View style={{ marginBottom: 20 }}>
          <ScorePod state={state} />
        </View>
      )}
      <Button
        label="I'm ready"
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

export function QuestionView({ state, dispatch, soundOn }: { state: TriviaState; dispatch: Dispatch; soundOn: boolean }) {
  const question = state.question;
  const revealed = state.phase === 'reveal';
  const last = state.turnAnswers[state.turnAnswers.length - 1];
  const turnDone = revealed && state.turnAnswers.length >= state.settings.questionsPerTurn;
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
  const q = getQuestion(question.id);
  const pack = getPack(q.packId);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hud state={state} />

      <View style={styles.questionCard}>
        <Text style={type.label}>{pack.title}</Text>
        <Text style={styles.questionText}>{q.q}</Text>
      </View>

      {state.endsAt != null ? (
        <TimerBar endsAt={state.endsAt} total={state.settings.answerSeconds} onTimeUp={onTimeUp} />
      ) : revealed && last ? (
        <View style={styles.verdict}>
          <Icon
            name={last.correct ? 'check-circle' : last.picked ? 'x-circle' : 'clock'}
            size={20}
            color={last.correct ? colors.success : colors.danger}
          />
          <Text style={[styles.verdictText, { color: last.correct ? colors.success : colors.danger }]}>
            {last.correct ? `Correct, +${last.points} points` : last.picked ? 'Not quite' : "Time's up"}
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
        <Text style={styles.prompt}>Pick one answer</Text>
      )}

      <View style={styles.options}>
        {question.options.map((option, i) => {
          const isAnswer = option === q.a;
          const isPicked = last?.picked === option;
          const look = !revealed
            ? styles.option
            : isAnswer
              ? [styles.option, styles.optionRight]
              : isPicked
                ? [styles.option, styles.optionWrong]
                : [styles.option, styles.optionDim];
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              disabled={revealed}
              onPress={() => dispatch({ type: 'ANSWER', option, now: Date.now() })}
              style={({ pressed }) => [look, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <View style={[styles.letter, revealed && (isAnswer || isPicked) && { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                <Text style={styles.letterText}>{LETTERS[i]}</Text>
              </View>
              <Text
                style={[
                  styles.optionText,
                  revealed && isAnswer && { color: colors.background },
                  revealed && isPicked && !isAnswer && { color: colors.background },
                ]}
              >
                {option}
              </Text>
              {revealed && (isAnswer || isPicked) && (
                <Icon name={isAnswer ? 'check' : 'x'} size={18} color={colors.background} />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function TurnOverView({ state, dispatch }: { state: TriviaState; dispatch: Dispatch }) {
  const team = currentTeam(state);
  const turn = state.history[state.history.length - 1];
  const correct = turn?.answers.filter((a) => a.correct).length ?? 0;
  const total = turn?.answers.length ?? 0;
  const points = turn?.answers.reduce((n, a) => n + a.points, 0) ?? 0;
  const { teams } = state.settings;
  const nextTeam = teams[(state.teamIndex + 1) % teams.length];
  const finished = isLastTurn(state);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.summaryHead}>
        <Text style={type.label}>Turn over</Text>
        <Text style={styles.summaryScore}>
          {correct}/{total}
        </Text>
        <Text style={styles.summarySub}>
          right for {team.name} · +{points} points
        </Text>
      </View>
      <View style={styles.resultsCard}>
        <Text style={[type.label, { marginBottom: 10 }]}>This turn's questions</Text>
        {turn?.answers.map((a, i) => {
          const q = getQuestion(a.id);
          return (
            <View key={`${a.id}-${i}`} style={styles.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultQ}>{q.q}</Text>
                <Text style={styles.resultA}>{q.a}</Text>
                {!a.correct && <Text style={styles.resultMiss}>{a.picked ? `You said ${a.picked}` : 'Ran out of time'}</Text>}
              </View>
              <View style={[styles.resultMark, { backgroundColor: a.correct ? colors.primary : colors.surfaceHighest }]}>
                <Icon name={a.correct ? 'check' : 'x'} size={14} color={a.correct ? colors.onPrimary : colors.textDim} />
              </View>
            </View>
          );
        })}
      </View>
      {teams.length > 1 && (
        <View style={[styles.hud, { marginTop: 16 }]}>
          <Text style={[type.label, { marginBottom: 10 }]}>Scoreboard</Text>
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
  hud: { backgroundColor: colors.surfaceLow, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.surfaceHigh },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hudTeam: { fontFamily: fonts.semibold, fontSize: 14 },
  streak: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
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
  podName: { fontFamily: fonts.semibold, fontSize: 12 },
  podScore: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
  handoff: { alignItems: 'center', paddingVertical: 32 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  handoffName: { fontFamily: fonts.display, color: colors.text, fontSize: 28, marginTop: 16, textAlign: 'center' },
  handoffSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, marginTop: 4, textAlign: 'center' },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 22,
    marginTop: 12,
    minHeight: 180,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  questionText: { fontFamily: fonts.display, color: colors.text, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  prompt: { ...type.label, fontSize: 13, textAlign: 'center', marginVertical: 14 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  timerTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceHighest, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 5 },
  timerText: { fontFamily: fonts.display, fontSize: 20, width: 40, textAlign: 'right' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, marginVertical: 8 },
  verdictText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  nextBtn: { paddingHorizontal: 18 },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingLeft: 10,
    paddingRight: 18,
    paddingVertical: 10,
  },
  optionRight: { backgroundColor: colors.success },
  optionWrong: { backgroundColor: colors.danger },
  optionDim: { opacity: 0.45 },
  letter: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  optionText: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 17 },
  summaryHead: { alignItems: 'center', paddingVertical: 16 },
  summaryScore: { fontFamily: fonts.display, color: colors.text, fontSize: 48, marginTop: 8 },
  summarySub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, textAlign: 'center' },
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
  resultQ: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  resultA: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15, marginTop: 3 },
  resultMiss: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, marginTop: 1 },
  resultMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
