import { router } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { AppHeader, Screen } from '../../components/ui';
import { appActions } from '../../core/store';
import {
  createTriviaGame,
  leaderboardEntries,
  triviaReducer,
  type TriviaAction,
  type TriviaSettings,
  type TriviaState,
} from '../../games/trivia/engine';
import { leaderboardActions } from '../../games/trivia/leaderboard';
import { HandoffView, QuestionView, TurnOverView } from '../../games/trivia/PlayViews';
import { ResultsView } from '../../games/trivia/ResultsView';
import { SetupView } from '../../games/trivia/SetupView';

type Mode = { kind: 'setup'; settings?: TriviaSettings } | { kind: 'game'; state: TriviaState };
type ModeAction = TriviaAction | { type: 'NEW_GAME'; state: TriviaState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: triviaReducer(mode.state, action) };
}

export default function TriviaScreen() {
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const [soundOn, setSoundOn] = useState(true);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab, the home screen and the leaderboard.
  const saved = useRef<TriviaState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    const playedAt = Date.now();
    appActions.addGame({
      id: `${playedAt}`,
      gameId: 'trivia',
      playedAt,
      rounds: s.round,
      teams: s.settings.teams.map((t) => ({ name: t.name, color: t.color, emoji: t.emoji, score: s.scores[t.id] })),
    });
    const entries = leaderboardEntries(s, playedAt);
    leaderboardActions.add(entries);
    setNewEntryIds(new Set(entries.map((e) => e.id)));
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="Trivia" onBack={exit} />
        <SetupView
          initial={mode.settings}
          onStart={({ settings, soundOn: sound }) => {
            setSoundOn(sound);
            appActions.setSoundOn(sound);
            dispatch({ type: 'NEW_GAME', state: createTriviaGame(settings, Math.floor(Math.random() * 1e9)) });
          }}
        />
      </Screen>
    );
  }

  const { state } = mode;
  return (
    <Screen>
      <AppHeader
        variant="session"
        title="Trivia"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      {state.phase === 'handoff' && <HandoffView state={state} dispatch={dispatch} />}
      {(state.phase === 'question' || state.phase === 'reveal') && (
        <QuestionView state={state} dispatch={dispatch} soundOn={soundOn} />
      )}
      {state.phase === 'turnOver' && <TurnOverView state={state} dispatch={dispatch} />}
      {state.phase === 'gameOver' && (
        <ResultsView
          state={state}
          dispatch={dispatch}
          newEntryIds={newEntryIds}
          onChangeSettings={() => dispatch({ type: 'SETUP' })}
          onChooseGame={() => router.replace('/games')}
        />
      )}
    </Screen>
  );
}
