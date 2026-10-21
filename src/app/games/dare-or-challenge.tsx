import { router } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Confetti, FadeIn } from '../../components/motion';
import { AppHeader, Screen } from '../../components/ui';
import { earnsConfetti } from '../../core/celebrate';
import { appActions, useAppState } from '../../core/store';
import {
  createDareGame,
  dareReducer,
  matchStats,
  newSeed,
  type DareAction,
  type DareSettings,
  type DareState,
} from '../../games/dare-or-challenge/engine';
import { ResultView, SpinView, TaskView } from '../../games/dare-or-challenge/PlayViews';
import { ResultsView } from '../../games/dare-or-challenge/ResultsView';
import { SetupView } from '../../games/dare-or-challenge/SetupView';

type Mode = { kind: 'setup'; settings?: DareSettings } | { kind: 'game'; state: DareState };
type ModeAction = DareAction | { type: 'NEW_GAME'; state: DareState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: dareReducer(mode.state, action) };
}

export default function DareOrChallengeScreen() {
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const soundOn = useAppState((s) => s.soundOn);
  // The finished game that earned confetti, so a later game never inherits it.
  const [confettiFor, setConfettiFor] = useState<DareState | null>(null);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab and the home screen.
  const saved = useRef<DareState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    const perTeam = Object.values(matchStats(s).perPlayer).map((p) => ({ correct: p.done, total: p.turns }));
    setConfettiFor(earnsConfetti({ perTeam }) ? s : null);
    appActions.addGame({
      id: `${Date.now()}`,
      gameId: 'dare-or-challenge',
      playedAt: Date.now(),
      rounds: s.round,
      teams: s.settings.players.map((p) => ({ name: p.name, color: p.color, emoji: p.emoji, score: s.scores[p.id] })),
    });
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="Dare or Challenge" onBack={exit} />
        <SetupView
          initial={mode.settings}
          onStart={(settings) => dispatch({ type: 'NEW_GAME', state: createDareGame(settings, newSeed()) })}
        />
      </Screen>
    );
  }

  const { state } = mode;
  // The wheel stays mounted from spin to stop, so it animates instead of fading.
  const step = state.phase === 'spinning' ? 'spin' : state.phase;
  return (
    <Screen>
      <AppHeader
        variant="session"
        title="Dare or Challenge"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      <FadeIn key={`${step}-${state.history.length}`}>
        {(state.phase === 'spin' || state.phase === 'spinning') && (
          <SpinView state={state} dispatch={dispatch} soundOn={soundOn} />
        )}
        {state.phase === 'task' && <TaskView state={state} dispatch={dispatch} />}
        {state.phase === 'result' && <ResultView state={state} dispatch={dispatch} />}
        {state.phase === 'gameOver' && (
          <ResultsView state={state} dispatch={dispatch} onChooseGame={() => router.replace('/games')} />
        )}
      </FadeIn>
      <Confetti active={confettiFor === state} />
    </Screen>
  );
}
