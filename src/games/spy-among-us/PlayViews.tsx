import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Disclosure, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import {
  currentVoter,
  getPlayer,
  matchDecided,
  revealPlayer,
  spyWon,
  standings,
  tally,
  type SpyAction,
  type SpyOutcome,
  type SpyPlayer,
  type SpyState,
} from './engine';
import { getPack } from './words';

type Dispatch = (action: SpyAction) => void;

function buzz(enabled: boolean, kind: 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

function Avatar({ player, size = 46 }: { player: SpyPlayer; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: player.color }]}>
      <Text style={{ fontSize: size * 0.5 }}>{player.emoji}</Text>
    </View>
  );
}

function BigAvatar({ player }: { player: SpyPlayer }) {
  return (
    <View style={[styles.bigAvatar, { backgroundColor: player.color }]}>
      <Text style={{ fontSize: 44 }}>{player.emoji}</Text>
    </View>
  );
}

/** Round number on the left, where we are in this phase on the right. */
function Progress({ state, label }: { state: SpyState; label: string }) {
  return (
    <View style={styles.progress}>
      <Text style={styles.progressText}>
        Round {state.round} of {state.settings.rounds}
      </Text>
      <Text style={styles.progressText}>{label}</Text>
    </View>
  );
}

export function RevealView({ state, dispatch }: { state: SpyState; dispatch: Dispatch }) {
  const player = revealPlayer(state);
  const players = state.settings.players;
  const isSpy = player.id === state.spyId;
  const last = state.revealIndex === players.length - 1;
  const next = players[state.revealIndex + 1];
  const pack = getPack(state.packId);

  if (!state.roleShown) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Progress state={state} label={`Peek ${state.revealIndex + 1} of ${players.length}`} />
        <View style={styles.handoff}>
          <BigAvatar player={player} />
          <Text style={styles.handoffName}>{player.name}</Text>
          <Text style={styles.handoffSub}>Pass the phone. Everyone else, look away.</Text>
        </View>
        <Button label="See my role" size="lg" onPress={() => dispatch({ type: 'SHOW_ROLE' })} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Progress state={state} label={`${player.name}'s secret`} />
      {isSpy ? (
        <View style={styles.roleCard}>
          <Text style={type.label}>Your role</Text>
          <Text style={styles.roleWord}>You are the spy</Text>
          <Text style={styles.roleBody}>You don't know the word. Blend in and work out what it is.</Text>
          {state.settings.spyHint && pack && <Text style={styles.hintText}>The word is from {pack.title}</Text>}
        </View>
      ) : (
        <View style={styles.roleCard}>
          <Text style={type.label}>The secret word</Text>
          <Text style={styles.roleWord}>{state.word}</Text>
          {pack && <Text style={styles.hintText}>{pack.title}</Text>}
          <Text style={styles.roleBody}>You're not the spy. Show you know the word without giving it away.</Text>
        </View>
      )}
      <Button
        label={last ? 'Hide and start talking' : `Hide and pass to ${next.name}`}
        icon="eye-off"
        size="lg"
        onPress={() => dispatch({ type: 'HIDE_ROLE', now: Date.now() })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

function useSecondsLeft(endsAt: number | null) {
  const [left, setLeft] = useState(() => (endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))));
  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

export function DiscussView({ state, dispatch, soundOn }: { state: SpyState; dispatch: Dispatch; soundOn: boolean }) {
  const secondsLeft = useSecondsLeft(state.discussEndsAt);
  const starter = getPlayer(state, state.starterId)!;
  const [owningUp, setOwningUp] = useState(false);
  const warned = useRef(false);
  const timeUp = secondsLeft === 0;

  // Keep the screen on while people talk. Release only once the lock is actually held.
  useEffect(() => {
    const lock = activateKeepAwakeAsync('spy-among-us').then(
      () => true,
      () => false,
    );
    return () => {
      lock.then((held) => {
        if (held) deactivateKeepAwake('spy-among-us').catch(() => {});
      });
    };
  }, []);

  useEffect(() => {
    if (timeUp && !warned.current) {
      warned.current = true;
      buzz(soundOn, 'warning');
    }
  }, [timeUp, soundOn]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Progress state={state} label="Discussion" />
      <View style={styles.clock}>
        <Text style={[styles.clockValue, timeUp && { color: colors.danger }]}>
          {mm}:{ss}
        </Text>
        {timeUp && <Text style={[type.label, { color: colors.danger }]}>Time's up</Text>}
      </View>

      <Text style={[type.body, styles.starter]}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{starter.name}</Text> asks the first question.
      </Text>

      <View style={{ marginTop: 16 }}>
        <Disclosure title="How to play">
          {[
            'Ask anyone a question about the word, like "Would you find it in Mombasa?"',
            'Answer so your friends know you know it, without making it easy for the spy.',
            'Whoever answers asks the next question.',
          ].map((t) => (
            <Text key={t} style={[type.body, { fontSize: 14, marginTop: 4 }]}>
              {t}
            </Text>
          ))}
        </Disclosure>
      </View>

      {state.settings.voting === 'secret' ? (
        <Button
          label={timeUp ? 'Vote now' : 'Ready to vote'}
          size="lg"
          onPress={() => dispatch({ type: 'CALL_VOTE' })}
          style={{ marginTop: 24 }}
        />
      ) : (
        <>
          <Text style={styles.askTitle}>Point at the spy, then tap who got the most fingers.</Text>
          <View style={styles.choiceGrid}>
            {state.settings.players.map((p) => (
              <PlayerChoice key={p.id} player={p} onPress={() => dispatch({ type: 'ACCUSE', playerId: p.id })} />
            ))}
          </View>
        </>
      )}

      {owningUp ? (
        <View style={styles.ownUp}>
          <Text style={[type.body, { color: colors.text, textAlign: 'center' }]}>
            Only the spy should tap this. You'll reveal yourself and get one guess at the word.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setOwningUp(false)} style={{ flex: 1 }} />
            <Button label="I'm the spy" onPress={() => dispatch({ type: 'SPY_OWNS_UP' })} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button label="Spy: I know the word" variant="ghost" onPress={() => setOwningUp(true)} style={{ marginTop: 12 }} />
      )}
    </ScrollView>
  );
}

function PlayerChoice({ player, onPress }: { player: SpyPlayer; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={player.name}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && { borderColor: colors.primary }]}
    >
      <Avatar player={player} size={32} />
      <Text style={styles.choiceName} numberOfLines={1}>
        {player.name}
      </Text>
    </Pressable>
  );
}

export function VoteView({ state, dispatch }: { state: SpyState; dispatch: Dispatch }) {
  const voter = currentVoter(state);
  // The screen keys this view by voter, so every voter starts on the hand-off screen.
  const [ready, setReady] = useState(false);
  const players = state.settings.players;

  const runoffNames = state.candidates.map((id) => getPlayer(state, id)!.name);
  const choices = state.candidates.filter((id) => id !== voter.id || state.candidates.length === 1);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Progress state={state} label={`Vote ${state.voterIndex + 1} of ${players.length}`} />
      {state.runoff && (
        <Text style={[type.body, styles.notice]}>
          Tie. Runoff between {runoffNames.join(', ')}. Another tie and the spy walks free.
        </Text>
      )}
      {!ready ? (
        <>
          <View style={styles.handoff}>
            <BigAvatar player={voter} />
            <Text style={styles.handoffName}>{voter.name}</Text>
            <Text style={styles.handoffSub}>Take the phone and vote where nobody can see.</Text>
          </View>
          <Button label={`I'm ${voter.name}, let me vote`} size="lg" onPress={() => setReady(true)} />
        </>
      ) : (
        <>
          <Text style={styles.voteTitle}>{voter.name}, who is the spy?</Text>
          <View style={styles.choiceGrid}>
            {choices.map((id) => {
              const p = getPlayer(state, id)!;
              return <PlayerChoice key={id} player={p} onPress={() => dispatch({ type: 'CAST_VOTE', targetId: id })} />;
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function VerdictView({ state, dispatch }: { state: SpyState; dispatch: Dispatch }) {
  const accused = getPlayer(state, state.accusedId);
  const counts = state.settings.voting === 'secret' && Object.keys(state.votes).length > 0 ? tally(state) : [];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        {accused ? (
          <>
            <BigAvatar player={accused} />
            <Text style={styles.handoffName}>{accused.name} is voted out</Text>
            <Text style={styles.handoffSub}>Any last words? Then reveal if you were the spy.</Text>
          </>
        ) : (
          <>
            <Text style={styles.handoffName}>Nobody is voted out</Text>
            <Text style={styles.handoffSub}>The runoff tied too, so the spy slips away.</Text>
          </>
        )}
      </View>
      {counts.length > 0 && (
        <View style={styles.tallyCard}>
          <Text style={[type.label, { marginBottom: 6 }]}>{state.runoff ? 'Runoff votes' : 'Votes'}</Text>
          {counts.map(({ player, votes }) => (
            <View key={player.id} style={styles.tallyRow}>
              <Text style={styles.tallyName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.tallyVotes}>{votes}</Text>
            </View>
          ))}
        </View>
      )}
      <Button
        label={accused ? `Reveal ${accused.name}'s role` : 'Reveal the spy'}
        size="lg"
        onPress={() => dispatch({ type: 'REVEAL' })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

export function SpyGuessView({ state, dispatch }: { state: SpyState; dispatch: Dispatch }) {
  const spy = getPlayer(state, state.spyId)!;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.handoff}>
        <BigAvatar player={spy} />
        <Text style={styles.handoffName}>{state.guessEarly ? `${spy.name} owns up` : `${spy.name} was the spy`}</Text>
        <Text style={styles.handoffSub}>
          {state.guessEarly
            ? 'Name the secret word to win the round. Get it wrong and everyone else scores.'
            : 'One last chance: name the secret word and steal the round.'}
        </Text>
      </View>
      <View style={styles.choiceGrid}>
        {state.guessOptions.map((word) => (
          <Pressable
            key={word}
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'SPY_GUESS', word })}
            style={({ pressed }) => [styles.wordChoice, pressed && { borderColor: colors.primary }]}
          >
            <Text style={styles.wordChoiceText}>{word}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const OUTCOME_COPY: Record<SpyOutcome, { title: string; body: (spy: string, guess: string | null) => string }> = {
  'spy-escaped': {
    title: 'The spy got away',
    body: (spy) => `${spy} fooled everyone and scores 2 points.`,
  },
  'spy-caught': {
    title: 'Spy caught',
    body: (spy, guess) => `${spy} guessed "${guess}" and missed. Everyone else scores a point.`,
  },
  'spy-stole': {
    title: 'Caught, but stole it',
    body: (spy) => `${spy} was voted out but named the word, so takes 2 points.`,
  },
  'spy-guessed': {
    title: 'The spy cracked it',
    body: (spy) => `${spy} owned up and named the word. 3 points to the spy.`,
  },
  'spy-blundered': {
    title: 'Wrong word',
    body: (spy, guess) => `${spy} owned up and guessed "${guess}". Everyone else scores a point.`,
  },
};

export function RoundOverView({ state, dispatch }: { state: SpyState; dispatch: Dispatch }) {
  const record = state.history[state.history.length - 1];
  const spy = getPlayer(state, record.spyId)!;
  const accused = getPlayer(state, record.accusedId);
  const copy = OUTCOME_COPY[record.outcome];
  const won = spyWon(record.outcome);
  const decided = matchDecided(state);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.roleCard}>
        <Text style={type.label}>
          Round {record.round} · {won ? 'Spy wins' : 'Group wins'}
        </Text>
        <Text style={styles.outcomeTitle}>{copy.title}</Text>
        <Text style={styles.roleBody}>{copy.body(spy.name, record.spyGuess)}</Text>
        {record.outcome === 'spy-escaped' && (
          <Text style={[styles.roleBody, { marginTop: 4 }]}>
            {accused ? `${accused.name} was innocent.` : 'The vote ended in a tie.'}
          </Text>
        )}
      </View>

      <View style={styles.reveal}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>The word was</Text>
          <Text style={styles.revealWord}>{record.word}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={type.label}>Spy</Text>
          <Text style={styles.revealSpy}>{spy.name}</Text>
        </View>
      </View>

      <View style={styles.tallyCard}>
        <View style={styles.tableHead}>
          <Text style={[type.label, { flex: 1 }]}>Player</Text>
          <Text style={[type.label, styles.col]}>Round</Text>
          <Text style={[type.label, styles.col]}>Total</Text>
        </View>
        {standings(state).map(({ player, score }) => {
          const gained = record.points[player.id] ?? 0;
          return (
            <View key={player.id} style={styles.tableRow}>
              <Avatar player={player} size={24} />
              <Text style={styles.tallyName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={[styles.col, styles.gained, gained > 0 && { color: colors.success }]}>
                {gained > 0 ? `+${gained}` : '0'}
              </Text>
              <Text style={[styles.col, styles.total]}>{score}</Text>
            </View>
          );
        })}
      </View>

      {decided ? (
        <Button label="See who won" size="lg" onPress={() => dispatch({ type: 'END_GAME' })} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Button label="Next round" size="lg" onPress={() => dispatch({ type: 'NEXT_ROUND' })} style={{ marginTop: 24 }} />
          <Button
            label="End the game"
            variant="ghost"
            onPress={() => dispatch({ type: 'END_GAME' })}
            style={{ marginTop: 8 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  progressText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  handoff: { alignItems: 'center', paddingVertical: 32 },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  handoffName: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 24, textAlign: 'center' },
  handoffSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 6, textAlign: 'center' },
  roleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, marginTop: 20, alignItems: 'center' },
  roleWord: { fontFamily: fonts.display, color: colors.text, fontSize: 40, textAlign: 'center', marginTop: 8, letterSpacing: -0.5 },
  roleBody: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14 },
  hintText: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' },
  clock: { alignItems: 'center', paddingVertical: 24 },
  clockValue: { fontFamily: fonts.display, color: colors.text, fontSize: 64, letterSpacing: -1 },
  starter: { textAlign: 'center' },
  notice: { marginTop: 16, color: colors.text },
  askTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16, marginTop: 24, marginBottom: 12 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  choiceName: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  ownUp: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 16 },
  voteTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22, marginTop: 24, marginBottom: 16 },
  wordChoice: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  wordChoiceText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16, textAlign: 'center' },
  tallyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 16 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tallyName: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  tallyVotes: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  outcomeTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22, textAlign: 'center', marginTop: 8 },
  reveal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 16,
  },
  revealWord: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22, marginTop: 4 },
  revealSpy: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16, marginTop: 4 },
  tableHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  col: { width: 54, textAlign: 'right' },
  gained: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 15 },
  total: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
});
