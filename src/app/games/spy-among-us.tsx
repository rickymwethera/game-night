import { router } from 'expo-router';
import { useEffect, useReducer, useRef } from 'react';
import { AppHeader, Screen } from '../../components/ui';
import { appActions, useAppState } from '../../core/store';
import {
  createSpyGame,
  spyReducer,
  type SpyAction,
  type SpySettings,
  type SpyState,
} from '../../games/spy-among-us/engine';
import {
  DiscussView,
  RevealView,
  RoundOverView,
  SpyGuessView,
  VerdictView,
  VoteView,
} from '../../games/spy-among-us/PlayViews';
import { ResultsView } from '../../games/spy-among-us/ResultsView';
import { SetupView } from '../../games/spy-among-us/SetupView';

type Mode = { kind: 'setup'; settings?: SpySettings } | { kind: 'game'; state: SpyState };
type ModeAction = SpyAction | { type: 'NEW_GAME'; state: SpyState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: spyReducer(mode.state, action) };
}

export default function SpyAmongUsScreen() {
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const soundOn = useAppState((s) => s.soundOn);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab and the home screen.
  const saved = useRef<SpyState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    appActions.addGame({
      id: `${Date.now()}`,
      gameId: 'spy-among-us',
      playedAt: Date.now(),
      rounds: s.history.length,
      teams: s.settings.players.map((p) => ({ name: p.name, color: p.color, emoji: p.emoji, score: s.scores[p.id] })),
    });
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="SPY AMONG US" onBack={exit} />
        <SetupView
          initial={mode.settings}
          onStart={(settings) => dispatch({ type: 'NEW_GAME', state: createSpyGame(settings, Math.floor(Math.random() * 1e9)) })}
        />
      </Screen>
    );
  }

  const { state } = mode;
  return (
    <Screen>
      <AppHeader
        variant="session"
        title="SPY AMONG US"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      {state.phase === 'reveal' && <RevealView state={state} dispatch={dispatch} />}
      {state.phase === 'discuss' && <DiscussView key={state.round} state={state} dispatch={dispatch} soundOn={soundOn} />}
      {state.phase === 'vote' && (
        <VoteView key={`${state.round}-${state.runoff}-${state.voterIndex}`} state={state} dispatch={dispatch} />
      )}
      {state.phase === 'verdict' && <VerdictView state={state} dispatch={dispatch} />}
      {state.phase === 'spyGuess' && <SpyGuessView state={state} dispatch={dispatch} />}
      {state.phase === 'roundOver' && <RoundOverView state={state} dispatch={dispatch} />}
      {state.phase === 'gameOver' && (
        <ResultsView state={state} dispatch={dispatch} onChooseGame={() => router.replace('/games')} />
      )}
    </Screen>
  );
}
