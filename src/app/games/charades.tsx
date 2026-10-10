import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { AppHeader, Screen } from '../../components/ui';
import { appActions } from '../../core/store';
import {
  charadesReducer,
  createCharadesGame,
  type CharadesAction,
  type CharadesSettings,
  type CharadesState,
} from '../../games/charades/engine';
import { HandoffView, PlayingView, TurnSummaryView } from '../../games/charades/PlayViews';
import { ResultsView } from '../../games/charades/ResultsView';
import { SetupView } from '../../games/charades/SetupView';
import { CHARADES_CATEGORIES } from '../../games/charades/words';

type Mode = { kind: 'setup'; settings?: CharadesSettings } | { kind: 'game'; state: CharadesState };
type ModeAction = CharadesAction | { type: 'NEW_GAME'; state: CharadesState } | { type: 'SETUP' };

function modeReducer(mode: Mode, action: ModeAction): Mode {
  if (action.type === 'NEW_GAME') return { kind: 'game', state: action.state };
  if (action.type === 'SETUP') return { kind: 'setup', settings: mode.kind === 'game' ? mode.state.settings : mode.settings };
  if (mode.kind !== 'game') return mode;
  return { kind: 'game', state: charadesReducer(mode.state, action) };
}

export default function CharadesScreen() {
  const { decks } = useLocalSearchParams<{ decks?: string }>();
  const initialDecks = decks?.split(',').filter((id) => CHARADES_CATEGORIES.some((c) => c.id === id));
  const [mode, dispatch] = useReducer(modeReducer, { kind: 'setup' });
  const [soundOn, setSoundOn] = useState(true);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Save each finished game once, for the History tab and the home screen.
  const saved = useRef<CharadesState | null>(null);
  useEffect(() => {
    if (mode.kind !== 'game' || mode.state.phase !== 'gameOver' || saved.current === mode.state) return;
    saved.current = mode.state;
    const s = mode.state;
    appActions.addGame({
      id: `${Date.now()}`,
      gameId: 'charades',
      playedAt: Date.now(),
      rounds: s.round,
      teams: s.settings.teams.map((t) => ({ name: t.name, color: t.color, emoji: t.emoji, score: s.scores[t.id] })),
    });
  }, [mode]);

  if (mode.kind === 'setup') {
    return (
      <Screen>
        <AppHeader variant="session" title="LIVE GAME SESSION" onBack={exit} />
        <SetupView
          initial={mode.settings}
          initialDecks={initialDecks?.length ? initialDecks : undefined}
          onStart={({ settings, soundOn: sound }) => {
            setSoundOn(sound);
            appActions.setSoundOn(sound);
            dispatch({ type: 'NEW_GAME', state: createCharadesGame(settings, Math.floor(Math.random() * 1e9)) });
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
        title="LIVE GAME SESSION"
        backIcon={state.phase === 'gameOver' ? 'arrow-left' : 'x'}
        onBack={() => (state.phase === 'gameOver' ? exit() : dispatch({ type: 'SETUP' }))}
      />
      {state.phase === 'handoff' && <HandoffView state={state} dispatch={dispatch} />}
      {state.phase === 'playing' && <PlayingView state={state} dispatch={dispatch} soundOn={soundOn} />}
      {state.phase === 'turnSummary' && <TurnSummaryView state={state} dispatch={dispatch} />}
      {state.phase === 'gameOver' && (
        <ResultsView state={state} dispatch={dispatch} onChooseGame={() => router.replace('/games')} />
      )}
    </Screen>
  );
}
