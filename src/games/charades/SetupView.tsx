import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon, Pill, SectionHeader, Segmented, Stepper, Toggle, type } from '../../components/ui';
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
    setTeams(teams.map((t, i) => ({ ...t, players: everyone.filter((_, j) => j % teams.length === i) })));
  };

  const addTeam = () => {
    const used = new Set(teams.map((t) => t.id));
    let i = 0;
    while (used.has(`team-${i + 1}`)) i++;
    setTeams([...teams, makeTeam(i)]);
  };

  const toggleDeck = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));

  const selectedCards = CHARADES_CATEGORIES.filter((c) => categoryIds.includes(c.id)).reduce(
    (n, c) => n + c.words.length,
    0,
  );
  const firstTeam = teams[0];
  const canStart = categoryIds.length > 0;

  const start = () =>
    onStart({
      soundOn,
      settings: {
        ...DEFAULT_SETTINGS,
        teams: teams.map((t, i) => ({ ...t, name: t.name.trim() || makeTeam(i).name })),
        categoryIds,
        roundSeconds,
        targetPoints,
        skipPenalty,
      },
    });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={['#1C1F29', '#2A2233', '#4A2A22']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gameCard}
      >
        <View style={styles.gameTop}>
          <Text style={{ fontSize: 30 }}>🎭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gameTitle}>Charades</Text>
            <Text style={styles.edition}>NAIROBI & GLOBAL EDITION</Text>
          </View>
          <Pill label="Ready" icon="zap" bg={colors.surfaceHigh} fg={colors.textMuted} />
        </View>
        <View style={styles.modeToggle}>
          <View style={[styles.mode, styles.modeActive]}>
            <Icon name="users" size={16} color={colors.onPrimary} />
            <Text style={[styles.modeText, { color: colors.onPrimary }]}>Team Mode</Text>
          </View>
          <View style={styles.mode}>
            <Icon name="user" size={16} color={colors.textDim} />
            <Text style={[styles.modeText, { color: colors.textDim }]}>Free-for-All</Text>
            <Text style={styles.soon}>SOON</Text>
          </View>
        </View>
      </LinearGradient>

      <SectionHeader
        title="Players & Squads"
        icon="users"
        right={
          <Pressable onPress={shufflePlayers} style={styles.smallBtn} accessibilityRole="button">
            <Icon name="shuffle" size={14} color={colors.coral} />
            <Text style={styles.smallBtnText}>Shuffle</Text>
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
          <Icon name="plus-circle" size={16} color={colors.primary} />
          <Text style={styles.addTeamText}>Add another team</Text>
        </Pressable>
      )}

      <SectionHeader
        title="Card Deck"
        icon="layers"
        right={
          <Pressable
            onPress={() =>
              setCategoryIds(
                categoryIds.length === CHARADES_CATEGORIES.length ? [] : CHARADES_CATEGORIES.map((c) => c.id),
              )
            }
            hitSlop={8}
          >
            <Text style={styles.link}>
              {categoryIds.length === CHARADES_CATEGORIES.length ? 'Clear all' : `Select all ${CHARADES_CATEGORIES.length}`}
            </Text>
          </Pressable>
        }
      />
      <View style={styles.deckSummary}>
        <Pill label="ACTIVE SELECTION" bg={colors.pinkStrong} fg="#3D0020" />
        <Pill label={`${selectedCards} Cards`} bg={colors.surfaceLowest} fg={colors.text} />
      </View>
      <View style={styles.deckGrid}>
        {CHARADES_CATEGORIES.map((c) => {
          const on = categoryIds.includes(c.id);
          return (
            <Pressable
              key={c.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleDeck(c.id)}
              style={[styles.deckTile, on && styles.deckTileOn]}
            >
              <View style={styles.deckTileTop}>
                <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
                {on ? (
                  <View style={styles.check}>
                    <Icon name="check" size={12} color={colors.onPrimary} />
                  </View>
                ) : (
                  <Text style={styles.deckCount}>{c.words.length} cards</Text>
                )}
              </View>
              <Text style={styles.deckTitle} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={styles.deckSub} numberOfLines={1}>
                {c.tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Game Rules & Knobs" icon="sliders" />
      <View style={styles.rulesCard}>
        <RuleRow title="Round Timer" subtitle="Seconds per turn">
          <Segmented options={TIME_OPTIONS} value={roundSeconds as (typeof TIME_OPTIONS)[number]} onChange={setRoundSeconds} format={(s) => `${s}s`} />
        </RuleRow>
        <RuleRow title="Target Points" subtitle="Score to declare victory">
          <Stepper value={targetPoints} onChange={setTargetPoints} min={3} max={50} label="target points" />
        </RuleRow>
        <RuleRow title="Skip Penalty" subtitle="-1 point when passing a word">
          <Toggle value={skipPenalty} onChange={setSkipPenalty} color={colors.orange} label="Skip penalty" />
        </RuleRow>
        <RuleRow title="Buzz & Haptics" subtitle="Countdown buzz and vibration" last>
          <Toggle value={soundOn} onChange={setSoundOn} label="Buzz and haptics" />
        </RuleRow>
      </View>

      <Button
        label={canStart ? 'START GAME • ROUND 1 🚀' : 'PICK AT LEAST ONE DECK'}
        size="lg"
        disabled={!canStart}
        onPress={start}
        style={{ marginTop: 28 }}
      />
      <View style={styles.firstTurn}>
        <Icon name="smartphone" size={14} color={colors.coral} />
        <Text style={styles.firstTurnText}>
          First turn: Hand phone to{' '}
          <Text style={{ color: colors.coral }}>{firstTeam.players[0] ?? `${shortTeamName(firstTeam.name)}'s actor`}</Text> (
          {firstTeam.name})
        </Text>
      </View>
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
          style={[styles.teamName, { color: team.color }]}
          multiline
          maxLength={18}
          accessibilityLabel="Team name"
        />
        <View style={[styles.countBadge, { backgroundColor: team.color }]}>
          <Text style={styles.countText}>{team.players.length}</Text>
        </View>
      </View>
      {team.players.map((p, i) => (
        <View key={`${p}-${i}`} style={styles.playerRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {p}
            {i === 0 && <Text style={styles.captain}> (C)</Text>}
          </Text>
          {i === 0 ? (
            <Icon name="star" size={14} color={colors.primary} />
          ) : (
            <Pressable
              onPress={() => onChange((t) => ({ ...t, players: t.players.filter((_, j) => j !== i) }))}
              hitSlop={8}
              accessibilityLabel={`Remove ${p}`}
            >
              <Icon name="x" size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      ))}
      {team.players.length === 0 && !adding && (
        <Text style={styles.noPlayers}>Add names so the app can call out each actor.</Text>
      )}
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
        <Pressable onPress={() => setAdding(true)} style={styles.addPlayer} accessibilityRole="button">
          <Text style={styles.addPlayerText}>+ Add to {shortTeamName(team.name) || 'team'}</Text>
        </Pressable>
      )}
      {canRemove && (
        <Pressable onPress={onRemove} hitSlop={6} style={{ alignSelf: 'center', marginTop: 8 }}>
          <Text style={styles.removeTeam}>Remove team</Text>
        </Pressable>
      )}
    </View>
  );
}

function RuleRow({
  title,
  subtitle,
  children,
  last,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.ruleRow, !last && styles.ruleDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleSub}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  gameCard: { borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.surfaceHigh },
  gameTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gameTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 24 },
  edition: { fontFamily: fonts.bold, color: colors.coral, fontSize: 11, letterSpacing: 0.8 },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.pill,
    padding: 5,
    marginTop: 16,
  },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill },
  modeActive: { backgroundColor: colors.primary },
  modeText: { fontFamily: fonts.bold, fontSize: 14 },
  soon: { fontFamily: fonts.bold, fontSize: 9, color: colors.textDim, letterSpacing: 0.8 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  smallBtnText: { fontFamily: fonts.bold, color: colors.coral, fontSize: 13 },
  link: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  teamCard: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  teamHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
  teamName: { flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 26, padding: 0 },
  countBadge: { minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  countText: { fontFamily: fonts.extrabold, fontSize: 12, color: '#1A0050' },
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
  playerName: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  captain: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  noPlayers: { fontFamily: fonts.body, color: colors.textDim, fontSize: 12, marginBottom: 8 },
  playerInput: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addPlayer: { backgroundColor: colors.surfaceHigh, borderRadius: radius.pill, paddingVertical: 9, alignItems: 'center', marginTop: 4 },
  addPlayerText: { fontFamily: fonts.bold, color: colors.textMuted, fontSize: 12 },
  removeTeam: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 11 },
  addTeam: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addTeamText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  deckSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deckTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  deckTileOn: { backgroundColor: '#2A2236', borderColor: colors.primary },
  deckTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  deckCount: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  deckTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16, marginTop: 10 },
  deckSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rulesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  ruleSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 2 },
  firstTurn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  firstTurnText: { ...type.label, textTransform: 'none', letterSpacing: 0.3, fontSize: 12, color: colors.textMuted },
});
