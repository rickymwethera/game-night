import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Pill, type } from '../../components/ui';
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
    <View style={[styles.bigAvatar, { backgroundColor: player.color, shadowColor: player.color }]}>
      <Text style={{ fontSize: 56 }}>{player.emoji}</Text>
    </View>
  );
}

/** Round number and one dot per player, filled as each one has had their go. */
function Progress({ state, done, label }: { state: SpyState; done: number; label: string }) {
  return (
    <View style={styles.progress}>
      <Pill label={`ROUND ${state.round} OF ${state.settings.rounds}`} bg={colors.surfaceHigh} fg={colors.text} />
      <View style={styles.dots}>
        {state.settings.players.map((p, i) => (
          <View key={p.id} style={[styles.dot, i < done && { backgroundColor: colors.primary }]} />
        ))}
      </View>
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
        <Progress state={state} done={state.revealIndex} label={`Peek ${state.revealIndex + 1} of ${players.length}`} />
        <View style={styles.handoff}>
          <Pill label="PASS THE PHONE" icon="smartphone" bg="#3A2F55" fg={colors.primary} style={{ alignSelf: 'center' }} />
          <BigAvatar player={player} />
          <Text style={styles.handoffName}>{player.name}</Text>
          <Text style={styles.handoffSub}>it's your turn to peek</Text>
          <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
            Everyone else, look away. Only {player.name} should see the next screen.
          </Text>
        </View>
        <Button label="TAP TO SEE MY ROLE 👀" size="lg" onPress={() => dispatch({ type: 'SHOW_ROLE' })} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Progress state={state} done={state.revealIndex} label={`${player.name}'s secret`} />
      {isSpy ? (
        <LinearGradient colors={['#3D0020', '#640039', '#B83900']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roleCard}>
          <Text style={{ fontSize: 64 }}>🕵🏾</Text>
          <Text style={[type.label, { color: colors.pink, marginTop: 12 }]}>Your role</Text>
          <Text style={styles.roleWord}>YOU ARE THE SPY</Text>
          <Text style={styles.roleBody}>
            You don't know the word. Listen to everyone's answers, blend in, and work out what it is before they catch you.
          </Text>
          {state.settings.spyHint && pack && (
            <View style={styles.hint}>
              <Icon name="info" size={14} color={colors.pink} />
              <Text style={styles.hintText}>
                Hint: the word is from {pack.emoji} {pack.title}
              </Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <LinearGradient colors={['#2A2445', '#3C2F6E', '#493D73']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roleCard}>
          <Text style={[type.label, { color: colors.primary }]}>The secret word</Text>
          <Text style={styles.roleWord}>{state.word}</Text>
          {pack && <Pill label={`${pack.emoji} ${pack.title}`} bg="rgba(17,20,29,0.5)" fg={colors.text} style={{ alignSelf: 'center', marginTop: 12 }} />}
          <Text style={styles.roleBody}>
            You're not the spy. Answer questions so your friends can tell you know the word, but don't give it away.
          </Text>
        </LinearGradient>
      )}
      <Button
        label={last ? 'HIDE & START TALKING' : `HIDE & PASS TO ${next.name.toUpperCase()}`}
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
  const packs = state.settings.packIds.map(getPack).filter((p) => p != null);

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
      <Progress state={state} done={state.settings.players.length} label="Everyone has peeked" />
      <View style={[styles.clock, timeUp && { borderColor: colors.pinkStrong }]}>
        <Text style={[type.label, { color: timeUp ? colors.pinkStrong : colors.coral }]}>
          {timeUp ? "Time's up" : 'Discussion'}
        </Text>
        <Text style={[styles.clockValue, timeUp && { color: colors.pinkStrong }]}>
          {mm}:{ss}
        </Text>
      </View>

      <View style={styles.callout}>
        <Avatar player={starter} size={40} />
        <Text style={[type.body, { flex: 1, color: colors.text }]}>
          <Text style={{ fontFamily: fonts.bold, color: starter.color }}>{starter.name}</Text> asks the first question. Whoever
          answers asks the next one.
        </Text>
      </View>

      <View style={styles.tips}>
        <Text style={[type.label, { marginBottom: 8 }]}>How to play</Text>
        {[
          'Ask anyone a question about the word, like "Would you find it in Mombasa?"',
          'Answer so your friends know you know it, without making it easy for the spy.',
          'Vague or odd answers are suspicious. So is too much silence.',
        ].map((t, i) => (
          <Text key={t} style={[type.body, { fontSize: 14 }]}>
            <Text style={{ fontFamily: fonts.bold, color: colors.primary }}>{i + 1}. </Text>
            {t}
          </Text>
        ))}
        <View style={styles.packRow}>
          {packs.map((p) => (
            <Pill key={p.id} label={`${p.emoji} ${p.title}`} bg={colors.surfaceHigh} fg={colors.textMuted} />
          ))}
        </View>
      </View>

      {state.settings.voting === 'secret' ? (
        <Button
          label={timeUp ? 'VOTE NOW 🗳️' : 'READY TO VOTE 🗳️'}
          size="lg"
          onPress={() => dispatch({ type: 'CALL_VOTE' })}
          style={{ marginTop: 24 }}
        />
      ) : (
        <>
          <Text style={styles.askTitle}>Count down, point at the spy, then tap who got the most fingers.</Text>
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
            <Button label="I'm the spy" variant="pink" onPress={() => dispatch({ type: 'SPY_OWNS_UP' })} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button
          label="Spy: I know the word!"
          icon="zap"
          variant="ghost"
          onPress={() => setOwningUp(true)}
          style={{ marginTop: 12 }}
        />
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
      style={({ pressed }) => [styles.choice, pressed && { borderColor: player.color, transform: [{ scale: 0.98 }] }]}
    >
      <Avatar player={player} size={40} />
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
      <Progress state={state} done={state.voterIndex} label={`Ballot ${state.voterIndex + 1} of ${players.length}`} />
      {state.runoff && (
        <View style={[styles.callout, { borderColor: colors.coral }]}>
          <Icon name="alert-triangle" size={18} color={colors.coral} />
          <Text style={[type.body, { flex: 1, color: colors.text }]}>
            <Text style={{ fontFamily: fonts.bold }}>It's a tie! </Text>
            Runoff between {runoffNames.join(', ')}. Another tie and the spy walks free.
          </Text>
        </View>
      )}
      {!ready ? (
        <>
          <View style={styles.handoff}>
            <Pill label="SECRET BALLOT" icon="lock" bg="#3A2F55" fg={colors.primary} style={{ alignSelf: 'center' }} />
            <BigAvatar player={voter} />
            <Text style={styles.handoffName}>{voter.name}</Text>
            <Text style={styles.handoffSub}>who do you think is the spy?</Text>
            <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
              Take the phone and vote where nobody can see.
            </Text>
          </View>
          <Button label={`I'M ${voter.name.toUpperCase()}, LET ME VOTE`} size="lg" onPress={() => setReady(true)} />
        </>
      ) : (
        <>
          <Text style={styles.voteTitle}>{voter.name}, tap the spy</Text>
          <Text style={[type.body, { marginBottom: 16 }]}>Your vote stays secret until everyone has voted.</Text>
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
            <Pill label="THE GROUP HAS SPOKEN" icon="users" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center' }} />
            <BigAvatar player={accused} />
            <Text style={styles.handoffName}>{accused.name}</Text>
            <Text style={styles.handoffSub}>is voted out</Text>
            <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
              {accused.name}, any last words? Then reveal if you were the spy.
            </Text>
          </>
        ) : (
          <>
            <Pill label="STILL TIED" icon="alert-triangle" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center' }} />
            <Text style={{ fontSize: 72, marginTop: 24 }}>🤷🏾</Text>
            <Text style={[styles.handoffName, { fontSize: 32 }]}>Nobody is voted out</Text>
            <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
              The runoff tied too, so the spy slips away. Who was it?
            </Text>
          </>
        )}
      </View>
      {counts.length > 0 && (
        <View style={styles.tallyCard}>
          <Text style={[type.label, { marginBottom: 10 }]}>{state.runoff ? 'Runoff votes' : 'Votes'}</Text>
          {counts.map(({ player, votes }) => (
            <View key={player.id} style={styles.tallyRow}>
              <Avatar player={player} size={28} />
              <Text style={styles.tallyName} numberOfLines={1}>
                {player.name}
              </Text>
              <View style={styles.tallyTrack}>
                <View
                  style={[
                    styles.tallyBar,
                    { backgroundColor: player.color, width: `${(votes / state.settings.players.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.tallyVotes}>{votes}</Text>
            </View>
          ))}
        </View>
      )}
      <Button
        label={accused ? `REVEAL ${accused.name.toUpperCase()}'S ROLE` : 'REVEAL THE SPY'}
        icon="eye"
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
        <Pill
          label={state.guessEarly ? 'THE SPY OWNS UP' : 'SPY CAUGHT!'}
          icon="eye"
          bg={colors.pinkStrong}
          fg="#3D0020"
          style={{ alignSelf: 'center' }}
        />
        <BigAvatar player={spy} />
        <Text style={styles.handoffName}>{spy.name} 🕵🏾</Text>
        <Text style={styles.handoffSub}>{state.guessEarly ? 'thinks they cracked it' : 'was the spy all along'}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 10 }]}>
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
            style={({ pressed }) => [styles.wordChoice, pressed && { borderColor: colors.pink, transform: [{ scale: 0.98 }] }]}
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
    title: 'THE SPY GOT AWAY! 🕵🏾',
    body: (spy) => `${spy} fooled everyone and scores 2 points.`,
  },
  'spy-caught': {
    title: 'SPY CAUGHT! 🎉',
    body: (spy, guess) => `${spy} guessed "${guess}" and missed. Everyone else scores a point.`,
  },
  'spy-stole': {
    title: 'CAUGHT, BUT STOLE IT! 😱',
    body: (spy) => `${spy} was voted out but named the word, so takes 2 points.`,
  },
  'spy-guessed': {
    title: 'THE SPY CRACKED IT! 🕵🏾',
    body: (spy) => `${spy} owned up and named the word. 3 points to the spy.`,
  },
  'spy-blundered': {
    title: 'BOLD MOVE, WRONG WORD 😅',
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
  const pack = getPack(record.packId);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <LinearGradient
        colors={won ? ['#3D0020', '#640039', '#B83900'] : ['#2A2445', '#3C2F6E', '#493D73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.roleCard}
      >
        <Pill label={`ROUND ${record.round} • ${won ? 'SPY WINS' : 'GROUP WINS'}`} bg="rgba(17,20,29,0.5)" fg={colors.text} style={{ alignSelf: 'center' }} />
        <Text style={[styles.roleWord, { fontSize: 28 }]}>{copy.title}</Text>
        <Text style={styles.roleBody}>{copy.body(spy.name, record.spyGuess)}</Text>
        {record.outcome === 'spy-escaped' && (
          <Text style={[styles.roleBody, { marginTop: 4 }]}>
            {accused ? `${accused.name} was innocent.` : 'The vote ended in a tie.'}
          </Text>
        )}
      </LinearGradient>

      <View style={styles.reveal}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>The word was</Text>
          <Text style={styles.revealWord}>{record.word}</Text>
          {pack && <Text style={styles.revealPack}>{pack.emoji} {pack.title}</Text>}
        </View>
        <View style={{ alignItems: 'center' }}>
          <Avatar player={spy} size={52} />
          <Text style={styles.revealSpy}>Spy: {spy.name}</Text>
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
              <Avatar player={player} size={28} />
              <Text style={styles.tallyName} numberOfLines={1}>
                {player.name}
                {player.id === spy.id && ' 🕵🏾'}
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
        <Button label="SEE WHO WON 🏆" size="lg" onPress={() => dispatch({ type: 'END_GAME' })} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Button
            label={`NEXT ROUND • NEW SPY`}
            icon="rotate-cw"
            size="lg"
            onPress={() => dispatch({ type: 'NEXT_ROUND' })}
            style={{ marginTop: 24 }}
          />
          <Button
            label="End the game"
            icon="flag"
            variant="secondary"
            onPress={() => dispatch({ type: 'END_GAME' })}
            style={{ marginTop: 12 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  dots: { flexDirection: 'row', gap: 4, flex: 1, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceHighest },
  progressText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  handoff: { alignItems: 'center', paddingVertical: 28 },
  bigAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  handoffName: { fontFamily: fonts.display, color: colors.text, fontSize: 40, marginTop: 20, textAlign: 'center', letterSpacing: -0.8 },
  handoffSub: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 16, marginTop: 2 },
  roleCard: { borderRadius: radius.lg, padding: 24, marginTop: 20, alignItems: 'center' },
  roleWord: { fontFamily: fonts.display, color: colors.text, fontSize: 40, textAlign: 'center', marginTop: 8, letterSpacing: -0.8 },
  roleBody: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(17,20,29,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
  },
  hintText: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  clock: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 20,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: colors.surfaceHigh,
  },
  clockValue: { fontFamily: fonts.display, color: colors.text, fontSize: 64, letterSpacing: -1 },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  tips: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 6, marginTop: 16 },
  packRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  askTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18, marginTop: 24, marginBottom: 12 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  choiceName: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  ownUp: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 16 },
  voteTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 28, marginTop: 24 },
  wordChoice: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  wordChoiceText: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16, textAlign: 'center' },
  tallyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 16 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tallyName: { width: 96, fontFamily: fonts.semibold, color: colors.text, fontSize: 14, flexGrow: 1 },
  tallyTrack: { flex: 2, height: 8, borderRadius: 4, backgroundColor: colors.surfaceHighest, overflow: 'hidden' },
  tallyBar: { height: 8, borderRadius: 4 },
  tallyVotes: { width: 20, textAlign: 'right', fontFamily: fonts.display, color: colors.text, fontSize: 16 },
  reveal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 16,
  },
  revealWord: { fontFamily: fonts.display, color: colors.primary, fontSize: 28, marginTop: 4 },
  revealPack: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13, marginTop: 2 },
  revealSpy: { fontFamily: fonts.bold, color: colors.pink, fontSize: 12, marginTop: 6 },
  tableHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  col: { width: 54, textAlign: 'right' },
  gained: { fontFamily: fonts.bold, color: colors.textDim, fontSize: 15 },
  total: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
});
