import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Segmented, Stepper, Toggle } from '../../components/ui';
import { getSoundOn } from '../../core/store';
import { makeTeam, shortTeamName, shuffle, type Team } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, type CharadesSettings } from './engine';
import { CHARADES_CATEGORIES } from './words';

const TIME_OPTIONS = [45, 60, 90] as const;

export interface SetupResult {
  settings: CharadesSettings;
  soundOn: boolean;
}

export function SetupView({
  initial,
  initialDecks,
  onStart,
}: {
  initial?: CharadesSettings;
  initialDecks?: string[];
  onStart: (result: SetupResult) => void;
}) {
  const [teams, setTeams] = useState<Team[]>(initial?.teams ?? [makeTeam(0), makeTeam(1)]);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categoryIds ?? initialDecks ?? CHARADES_CATEGORIES.map((c) => c.id),
  );
  const [roundSeconds, setRoundSeconds] = useState<number>(initial?.roundSeconds ?? DEFAULT_SETTINGS.roundSeconds);
  const [targetPoints, setTargetPoints] = useState(initial?.targetPoints ?? DEFAULT_SETTINGS.targetPoints);
  const [skipPenalty, setSkipPenalty] = useState(initial?.skipPenalty ?? DEFAULT_SETTINGS.skipPenalty);
  const [soundOn, setSoundOn] = useState(getSoundOn);

  const updateTeam = (id: string, change: (t: Team) => Team) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? change(t) : t)));

  const shufflePlayers = () => {
    const everyone = shuffle(teams.flatMap((t) => t.players));
    setTeams(
      teams.map((t, i) => ({
        ...t,
        players: everyone.filter((_, j) => j % teams.length === i),
      })),
    );
  };

  const addTeam = () => {
    const used = new Set(teams.map((t) => t.id));
    let i = 0;
    while (used.has(`team-${i + 1}`)) i++;
    setTeams([...teams, makeTeam(i)]);
  };

  const toggleDeck = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));

  const allDecks = categoryIds.length === CHARADES_CATEGORIES.length;
  const canStart = categoryIds.length > 0;
  const summary = `${roundSeconds}s · ${targetPoints} points`;

  const start = () =>
    onStart({
      soundOn,
      settings: {
        ...DEFAULT_SETTINGS,
        teams: teams.map((t, i) => ({
          ...t,
          name: t.name.trim() || makeTeam(i).name,
        })),
        categoryIds,
        roundSeconds,
        targetPoints,
        skipPenalty,
      },
    });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionHeader
        title="Teams"
        right={
          <Pressable
            onPress={shufflePlayers}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Shuffle players"
          >
            <Text style={styles.link}>Shuffle</Text>
          </Pressable>
        }
      />
      <View style={styles.teamGrid}>
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            canRemove={teams.length > 2}
            onChange={(change) => updateTeam(team.id, change)}
            onRemove={() => setTeams(teams.filter((t) => t.id !== team.id))}
          />
        ))}
      </View>
      {teams.length < 4 && (
        <Pressable onPress={addTeam} style={styles.addTeam} accessibilityRole="button">
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text style={styles.addTeamText}>Add team</Text>
        </Pressable>
      )}

      <SectionHeader
        title="Decks"
        right={
          <Pressable
            onPress={() => setCategoryIds(allDecks ? [] : CHARADES_CATEGORIES.map((c) => c.id))}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.link}>{allDecks ? 'Clear all' : 'Select all'}</Text>
          </Pressable>
        }
      />
      <View style={styles.deckGrid}>
        {CHARADES_CATEGORIES.map((c) => {
          const on = categoryIds.includes(c.id);
          return (
            <Pressable
              key={c.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={c.title}
              onPress={() => toggleDeck(c.id)}
              style={[styles.deckTile, on && styles.deckTileOn]}
            >
              <Text style={styles.deckEmoji}>{c.emoji}</Text>
              <Text style={styles.deckTitle} numberOfLines={2}>
                {c.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 28 }}>
        <Disclosure title="Settings" summary={summary}>
          <RuleRow title="Round timer">
            <Segmented
              options={TIME_OPTIONS}
              value={roundSeconds as (typeof TIME_OPTIONS)[number]}
              onChange={setRoundSeconds}
              format={(s) => `${s}s`}
            />
          </RuleRow>
          <RuleRow title="Points to win">
            <Stepper value={targetPoints} onChange={setTargetPoints} min={3} max={50} label="target points" />
          </RuleRow>
          <RuleRow title="Lose a point for passing">
            <Toggle value={skipPenalty} onChange={setSkipPenalty} label="Skip penalty" />
          </RuleRow>
          <RuleRow title="Buzz and haptics" last>
            <Toggle value={soundOn} onChange={setSoundOn} label="Buzz and haptics" />
          </RuleRow>
        </Disclosure>
      </View>

      <Button
        label={canStart ? 'Start game' : 'Pick at least one deck'}
        size="lg"
        disabled={!canStart}
        onPress={start}
        style={{ marginTop: 28 }}
      />
    </ScrollView>
  );
}

function TeamCard({
  team,
  canRemove,
  onChange,
  onRemove,
}: {
  team: Team;
  canRemove: boolean;
  onChange: (change: (t: Team) => Team) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const add = () => {
    const name = draft.trim();
    if (name) onChange((t) => ({ ...t, players: [...t.players, name] }));
    setDraft('');
  };

  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHead}>
        <View style={[styles.teamDot, { backgroundColor: team.color }]} />
        <TextInput
          value={team.name}
          onChangeText={(name) => onChange((t) => ({ ...t, name }))}
          style={styles.teamName}
          multiline
          maxLength={18}
          accessibilityLabel="Team name"
        />
      </View>
      {team.players.map((p, i) => (
        <View key={`${p}-${i}`} style={styles.playerRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {p}
          </Text>
          <Pressable
            onPress={() =>
              onChange((t) => ({
                ...t,
                players: t.players.filter((_, j) => j !== i),
              }))
            }
            hitSlop={8}
            accessibilityLabel={`Remove ${p}`}
          >
            <Icon name="x" size={14} color={colors.textDim} />
          </Pressable>
        </View>
      ))}
      {adding ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          onBlur={() => {
            add();
            setAdding(false);
          }}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="Player name"
          placeholderTextColor={colors.textDim}
          style={styles.playerInput}
          maxLength={16}
        />
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={styles.addPlayer}
          accessibilityRole="button"
          accessibilityLabel={`Add player to ${shortTeamName(team.name) || 'team'}`}
        >
          <Text style={styles.addPlayerText}>Add player</Text>
        </Pressable>
      )}
      {canRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={{ alignSelf: 'center', marginTop: 8 }}
          accessibilityRole="button"
        >
          <Text style={styles.removeTeam}>Remove team</Text>
        </Pressable>
      )}
    </View>
  );
}

function RuleRow({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.ruleRow, !last && styles.ruleDivider]}>
      <Text style={styles.ruleTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  link: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  teamCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
  },
  teamHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  teamName: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
    padding: 0,
    color: colors.text,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 6,
  },
  playerName: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 14,
  },
  playerInput: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addPlayer: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
  },
  addPlayerText: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 13,
  },
  removeTeam: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12 },
  addTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  addTeamText: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 14,
  },
  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deckTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  deckTileOn: { borderColor: colors.primary },
  deckEmoji: { fontSize: 20 },
  deckTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleTitle: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 15,
  },
});
