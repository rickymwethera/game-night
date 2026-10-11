import { router } from 'expo-router';
import { useEffect, useReducer, useRef } from 'react';
import { AppHeader, Screen } from '../../components/ui';
import { appActions, useAppState } from '../../core/store';
import {
  createFiveGame,
  fiveReducer,
  type FiveAction,
  type FiveSettings,
  type FiveState,
} from '../../games/five-second/engine';
import { HandoffView, PlayingView, VerdictView } from '../../games/five-second/PlayViews';
import { ResultsView } from '../../games/five-second/ResultsView';
import { SetupView } from '../../games/five-second/SetupView';

type Mode = { kind: 'setup'; settings?: FiveSettings } | { kind: 'game'; state: FiveState };
type ModeAction = FiveAction | { type: 'NEW_GAME'; state: FiveState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: fiveReducer(mode.state, action) };
}

export default function FiveSecondScreen() {
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const soundOn = useAppState((s) => s.soundOn);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab and the home screen.
  const saved = useRef<FiveState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    appActions.addGame({
      id: `${Date.now()}`,
      gameId: 'five-second',
      playedAt: Date.now(),
      rounds: s.round,
      teams: s.settings.players.map((p) => ({ name: p.name, color: p.color, emoji: p.emoji, score: s.scores[p.id] })),
    });
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="5-SECOND CHALLENGE" onBack={exit} />
        <SetupView
          initial={mode.settings}
          onStart={(settings) => dispatch({ type: 'NEW_GAME', state: createFiveGame(settings, Math.floor(Math.random() * 1e9)) })}
        />
      </Screen>
    );
  }

  const { state } = mode;
  return (
    <Screen>
      <AppHeader
        variant="session"
        title="5-SECOND CHALLENGE"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      {state.phase === 'handoff' && <HandoffView key={state.history.length} state={state} dispatch={dispatch} soundOn={soundOn} />}
      {state.phase === 'playing' && <PlayingView key={state.endsAt} state={state} dispatch={dispatch} soundOn={soundOn} />}
      {state.phase === 'verdict' && <VerdictView key={state.attempts.length} state={state} dispatch={dispatch} soundOn={soundOn} />}
      {state.phase === 'gameOver' && (
        <ResultsView state={state} dispatch={dispatch} onChooseGame={() => router.replace('/games')} />
      )}
    </Screen>
  );
}
