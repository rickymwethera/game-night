import { router } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Confetti, FadeIn } from '../../components/motion';
import { AppHeader, Screen } from '../../components/ui';
import { earnsConfetti } from '../../core/celebrate';
import { appActions } from '../../core/store';
import {
  createFlagsGame,
  flagsReducer,
  matchStats,
  type FlagsAction,
  type FlagsSettings,
  type FlagsState,
} from '../../games/flags/engine';
import { HandoffView, QuestionView, TurnOverView } from '../../games/flags/PlayViews';
import { ResultsView } from '../../games/flags/ResultsView';
import { SetupView } from '../../games/flags/SetupView';

type Mode = { kind: 'setup'; settings?: FlagsSettings } | { kind: 'game'; state: FlagsState };
type ModeAction = FlagsAction | { type: 'NEW_GAME'; state: FlagsState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: flagsReducer(mode.state, action) };
}

export default function FlagsScreen() {
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const [soundOn, setSoundOn] = useState(true);
  // The finished game that earned confetti, so a later game never inherits it.
  const [confettiFor, setConfettiFor] = useState<FlagsState | null>(null);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab and the home screen.
  const saved = useRef<FlagsState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    setConfettiFor(earnsConfetti({ perTeam: Object.values(matchStats(s).perTeam) }) ? s : null);
    appActions.addGame({
      id: `${Date.now()}`,
      gameId: 'flags',
      playedAt: Date.now(),
      rounds: s.round,
      teams: s.settings.teams.map((t) => ({ name: t.name, color: t.color, emoji: t.emoji, score: s.scores[t.id] })),
    });
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="Guess the Flag" onBack={exit} />
        <SetupView
          initial={mode.settings}
          onStart={({ settings, soundOn: sound }) => {
            setSoundOn(sound);
            appActions.setSoundOn(sound);
            dispatch({ type: 'NEW_GAME', state: createFlagsGame(settings, Math.floor(Math.random() * 1e9)) });
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
        title="Guess the Flag"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      <FadeIn key={state.phase === 'reveal' ? 'question' : state.phase}>
        {state.phase === 'handoff' && <HandoffView state={state} dispatch={dispatch} />}
        {(state.phase === 'question' || state.phase === 'reveal') && (
          <QuestionView state={state} dispatch={dispatch} soundOn={soundOn} />
        )}
        {state.phase === 'turnOver' && <TurnOverView state={state} dispatch={dispatch} />}
        {state.phase === 'gameOver' && (
          <ResultsView
            state={state}
            dispatch={dispatch}
            onChangeSettings={() => dispatch({ type: 'SETUP' })}
            onChooseGame={() => router.replace('/games')}
          />
        )}
      </FadeIn>
      <Confetti active={confettiFor === state} />
    </Screen>
  );
}
