/**
 * Trivia on the TV: a big, landscape, read-only copy of what the room should
 * see. The host's phone runs the game and sends its state; nothing here
 * dispatches actions. Upcoming questions never reach the TV (see core/tv.ts).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { FadeIn } from '../../components/motion';
import { colors, fonts } from '../../theme';
import { currentStreak, currentTeam, getPack, getQuestion, isLastTurn, matchStats, standings, type TriviaState } from './engine';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Everything is sized for a 1280x720 screen and scaled to the real one. */
type Scale = (n: number) => number;

function Scoreboard({ state, z }: { state: TriviaState; z: Scale }) {
  if (state.settings.teams.length < 2) return null;
  const playing = state.phase === 'gameOver' ? null : currentTeam(state).id;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: z(16) }}>
      {state.settings.teams.map((t) => (
        <View
          key={t.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: z(10),
            paddingVertical: z(10),
            paddingHorizontal: z(20),
            borderRadius: 999,
            backgroundColor: colors.surfaceHigh,
            borderWidth: z(3),
            borderColor: t.id === playing ? t.color : 'transparent',
          }}
        >
          <Text style={{ fontSize: z(26) }}>{t.emoji}</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: z(22), color: t.color }}>{t.name}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: z(30), color: colors.text }}>{state.scores[t.id]}</Text>
        </View>
      ))}
    </View>
  );
}

function Countdown({ endsAt, total, z }: { endsAt: number; total: number; z: Scale }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const msLeft = Math.max(0, endsAt - now);
  const urgent = msLeft <= 3000;
  const color = urgent ? colors.danger : colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(16) }}>
      <View style={{ flex: 1, height: z(14), borderRadius: z(7), backgroundColor: colors.surfaceHighest, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.min(100, (msLeft / (total * 1000)) * 100)}%`, backgroundColor: color }} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: z(40), color, width: z(80), textAlign: 'right' }}>
        {Math.ceil(msLeft / 1000)}s
      </Text>
    </View>
  );
}

function Centered({ children, z }: { children: ReactNode; z: Scale }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(16) }}>{children}</View>;
}

function Handoff({ state, z }: { state: TriviaState; z: Scale }) {
  const team = currentTeam(state);
  const { questionsPerTurn, answerSeconds, rounds } = state.settings;
  return (
    <Centered z={z}>
      <Text style={label(z)}>{state.settings.teams.length > 1 ? 'Up next' : 'Get ready'}</Text>
      <View style={{ width: z(150), height: z(150), borderRadius: z(75), backgroundColor: team.color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: z(72) }}>{team.emoji}</Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: z(72), color: colors.text }}>{team.name}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: z(28), color: colors.textMuted }}>
        {questionsPerTurn} questions
        {answerSeconds > 0 ? ` · ${answerSeconds}s each` : ''}
        {rounds > 1 ? ` · Round ${state.round} of ${rounds}` : ''}
      </Text>
    </Centered>
  );
}

function Question({ state, endsAt, z }: { state: TriviaState; endsAt: number | null; z: Scale }) {
  const question = state.question;
  if (!question) return null;
  const q = getQuestion(question.id);
  const team = currentTeam(state);
  const revealed = state.phase === 'reveal';
  const last = revealed ? state.turnAnswers[state.turnAnswers.length - 1] : undefined;
  const number = Math.min(state.settings.questionsPerTurn, state.turnAnswers.length + (revealed ? 0 : 1));
  const streak = currentStreak(state.turnAnswers);

  return (
    <View style={{ flex: 1, gap: z(24) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(16) }}>
        <View style={{ width: z(60), height: z(60), borderRadius: z(30), backgroundColor: team.color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: z(30) }}>{team.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: z(24), color: team.color }}>{team.name}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: z(22), color: colors.textMuted }}>
            {getPack(q.packId).title} · Question {number} of {state.settings.questionsPerTurn}
            {streak >= 2 ? ` · ${streak} in a row` : ''}
          </Text>
        </View>
        {last && (
          <Text style={{ fontFamily: fonts.display, fontSize: z(40), color: last.correct ? colors.success : colors.danger }}>
            {last.correct ? `Correct! +${last.points}` : last.picked ? 'Not quite' : "Time's up"}
          </Text>
        )}
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: z(56), lineHeight: z(66), color: colors.text, textAlign: 'center' }}>
          {q.q}
        </Text>
      </View>

      {endsAt != null && !revealed && <Countdown endsAt={endsAt} total={state.settings.answerSeconds} z={z} />}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: z(16) }}>
        {question.options.map((option, i) => {
          const isAnswer = option === q.a;
          const isPicked = last?.picked === option;
          const bg = !revealed ? colors.surfaceHigh : isAnswer ? colors.success : isPicked ? colors.danger : colors.surfaceHigh;
          const fg = revealed && (isAnswer || isPicked) ? colors.background : colors.text;
          return (
            <View
              key={option}
              style={{
                flexBasis: '48%',
                flexGrow: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: z(18),
                minHeight: z(96),
                paddingHorizontal: z(20),
                borderRadius: z(24),
                backgroundColor: bg,
                opacity: revealed && !isAnswer && !isPicked ? 0.4 : 1,
              }}
            >
              <View style={{ width: z(52), height: z(52), borderRadius: z(26), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: z(24), color: fg }}>{LETTERS[i]}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: z(32), color: fg }}>{option}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TurnOver({ state, z }: { state: TriviaState; z: Scale }) {
  const team = currentTeam(state);
  const turn = state.history[state.history.length - 1];
  const correct = turn?.answers.filter((a) => a.correct).length ?? 0;
  const points = turn?.answers.reduce((n, a) => n + a.points, 0) ?? 0;
  const next = state.settings.teams[(state.teamIndex + 1) % state.settings.teams.length];
  return (
    <Centered z={z}>
      <Text style={label(z)}>Turn over</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: z(120), color: colors.text }}>
        {correct}/{turn?.answers.length ?? 0}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: z(30), color: colors.textMuted }}>
        right for {team.name} · +{points} points
      </Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: z(26), color: colors.primary, marginTop: z(16) }}>
        {isLastTurn(state) ? 'Final results coming up' : `Next up: ${next.name}`}
      </Text>
    </Centered>
  );
}

function GameOver({ state, z }: { state: TriviaState; z: Scale }) {
  const ranked = standings(state);
  const stats = matchStats(state);
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const headline = ranked.length === 1 ? `${ranked[0].score} points` : tie ? "It's a tie" : `${ranked[0].team.name} wins!`;
  return (
    <Centered z={z}>
      <Text style={{ fontFamily: fonts.display, fontSize: z(80), color: colors.text }}>{headline}</Text>
      <View style={{ width: '70%', gap: z(12), marginTop: z(16) }}>
        {ranked.map(({ team, score }, i) => (
          <View
            key={team.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: z(20), padding: z(16), borderRadius: z(24), backgroundColor: i === 0 ? colors.surfaceHighest : colors.surfaceLow }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: z(36), color: colors.textDim, width: z(40) }}>{i + 1}</Text>
            <Text style={{ fontSize: z(40) }}>{team.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: z(32), color: team.color }}>{team.name}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: z(20), color: colors.textMuted }}>
                {stats.perTeam[team.id].correct} of {stats.perTeam[team.id].total} right
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: z(48), color: colors.text }}>{score}</Text>
          </View>
        ))}
      </View>
    </Centered>
  );
}

const label = (z: Scale): TextStyle => ({ fontFamily: fonts.semibold, fontSize: z(24), color: colors.textDim, textTransform: 'uppercase', letterSpacing: z(2) });

/** `endsAt` is the question timer already moved onto this screen's clock. */
export function TriviaTvView({ state, endsAt, z }: { state: TriviaState; endsAt: number | null; z: Scale }) {
  const showScores = state.phase !== 'gameOver';
  return (
    <View style={{ flex: 1, gap: z(24) }}>
      <FadeIn key={state.phase === 'reveal' ? 'question' : state.phase} style={{ flex: 1 }}>
        {state.phase === 'handoff' && <Handoff state={state} z={z} />}
        {(state.phase === 'question' || state.phase === 'reveal') && <Question state={state} endsAt={endsAt} z={z} />}
        {state.phase === 'turnOver' && <TurnOver state={state} z={z} />}
        {state.phase === 'gameOver' && <GameOver state={state} z={z} />}
      </FadeIn>
      {showScores && <Scoreboard state={state} z={z} />}
    </View>
  );
}
