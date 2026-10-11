import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon, Pill, SectionHeader, Segmented, Stepper, Toggle } from '../../components/ui';
import { getProfile } from '../../core/store';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, type FivePlayer, type FiveSettings } from './engine';
import { FIVE_PACKS } from './packs';

const TIMER_OPTIONS = [5, 7, 10] as const;

const PLAYER_LOOKS = [
  { color: '#FF8A5B', emoji: '🦁' },
  { color: '#D0BCFF', emoji: '🦏' },
  { color: '#FFB0CD', emoji: '🐆' },
  { color: '#7CE0A3', emoji: '🐘' },
  { color: '#FFD166', emoji: '🦒' },
  { color: '#8FD3FF', emoji: '🦓' },
  { color: '#FFB59D', emoji: '🦛' },
  { color: '#B794FF', emoji: '🐊' },
  { color: '#F15CA0', emoji: '🦩' },
  { color: '#C4C6D0', emoji: '🐃' },
  { color: '#FF8A80', emoji: '🐒' },
  { color: '#A0E7E5', emoji: '🦜' },
];

function makePlayer(index: number, name = ''): FivePlayer {
  const look = PLAYER_LOOKS[index % PLAYER_LOOKS.length];
  return { id: `p${index + 1}`, name, ...look };
}

function defaultPlayers(): FivePlayer[] {
  return Array.from({ length: 3 }, (_, i) => makePlayer(i, i === 0 ? getProfile().displayName : ''));
}

const fallbackName = (index: number) => `Player ${index + 1}`;

export function SetupView({ initial, onStart }: { initial?: FiveSettings; onStart: (settings: FiveSettings) => void }) {
  const [players, setPlayers] = useState<FivePlayer[]>(initial?.players ?? defaultPlayers);
  const [packIds, setPackIds] = useState<string[]>(initial?.packIds ?? FIVE_PACKS.map((p) => p.id));
  const [seconds, setSeconds] = useState<number>(initial?.seconds ?? DEFAULT_SETTINGS.seconds);
  const [rounds, setRounds] = useState(initial?.rounds ?? DEFAULT_SETTINGS.rounds);
  const [steals, setSteals] = useState(initial?.steals ?? DEFAULT_SETTINGS.steals);

  const addPlayer = () => {
    const used = new Set(players.map((p) => p.id));
    let i = 0;
    while (used.has(`p${i + 1}`)) i++;
    setPlayers([...players, makePlayer(i)]);
  };
  const rename = (id: string, name: string) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  const togglePack = (id: string) => setPackIds((ids) => (ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id]));

  const prompts = FIVE_PACKS.filter((p) => packIds.includes(p.id)).reduce((n, p) => n + p.prompts.length, 0);
  const canStart = packIds.length > 0 && players.length >= MIN_PLAYERS;
  const allPacks = packIds.length === FIVE_PACKS.length;

  const start = () =>
    onStart({
      players: players.map((p, i) => ({ ...p, name: p.name.trim() || fallbackName(i) })),
      packIds,
      seconds,
      rounds,
      steals,
    });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={['#1C1F29', '#2A2236', '#4A1F38']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gameCard}
      >
        <View style={styles.gameTop}>
          <Text style={{ fontSize: 30 }}>⏱️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gameTitle}>5-Second Challenge</Text>
            <Text style={styles.edition}>KENYAN & GLOBAL EDITION</Text>
          </View>
          <Pill label="Name 3" icon="zap" bg={colors.surfaceHigh} fg={colors.textMuted} />
        </View>
        <Text style={styles.howTo}>
          A category pops up and the clock starts. Name three things before the buzzer while everyone else taps once
          for each answer. Freeze up and the next player can steal the point.
        </Text>
      </LinearGradient>

      <SectionHeader
        title="Players"
        icon="users"
        subtitle={`${MIN_PLAYERS} to ${MAX_PLAYERS} players, one phone`}
        right={<Pill label={`${players.length} / ${MAX_PLAYERS}`} bg={colors.surfaceHigh} fg={colors.text} />}
      />
      <View style={styles.playerList}>
        {players.map((p, i) => (
          <View key={p.id} style={styles.playerRow}>
            <View style={[styles.avatar, { backgroundColor: p.color }]}>
              <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
            </View>
            <TextInput
              value={p.name}
              onChangeText={(name) => rename(p.id, name)}
              placeholder={fallbackName(i)}
              placeholderTextColor={colors.textDim}
              style={styles.playerInput}
              maxLength={16}
              accessibilityLabel={`Player ${i + 1} name`}
            />
            {players.length > MIN_PLAYERS && (
              <Pressable
                onPress={() => setPlayers(players.filter((x) => x.id !== p.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${p.name || fallbackName(i)}`}
              >
                <Icon name="x" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {players.length < MAX_PLAYERS && (
        <Pressable onPress={addPlayer} style={styles.addPlayer} accessibilityRole="button">
          <Icon name="user-plus" size={16} color={colors.primary} />
          <Text style={styles.addPlayerText}>Add player</Text>
        </Pressable>
      )}

      <SectionHeader
        title="Prompt Packs"
        icon="layers"
        right={
          <Pressable onPress={() => setPackIds(allPacks ? [] : FIVE_PACKS.map((p) => p.id))} hitSlop={8}>
            <Text style={styles.link}>{allPacks ? 'Clear all' : `Select all ${FIVE_PACKS.length}`}</Text>
          </Pressable>
        }
      />
      <View style={styles.packSummary}>
        <Pill label="CATEGORIES IN PLAY" bg={colors.pinkStrong} fg="#3D0020" />
        <Pill label={`${prompts} Prompts`} bg={colors.surfaceLowest} fg={colors.text} />
      </View>
      {(['kenyan', 'global'] as const).map((collection) => (
        <View key={collection}>
          <Text style={styles.collection}>{collection === 'kenyan' ? '🇰🇪 Kenyan Vault' : '🌍 Global Hits'}</Text>
          <View style={styles.packGrid}>
            {FIVE_PACKS.filter((p) => p.collection === collection).map((p) => {
              const on = packIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => togglePack(p.id)}
                  style={[styles.packTile, on && styles.packTileOn]}
                >
                  <View style={styles.packTileTop}>
                    <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                    {on ? (
                      <View style={styles.check}>
                        <Icon name="check" size={12} color={colors.onPrimary} />
                      </View>
                    ) : (
                      <Text style={styles.packCount}>{p.prompts.length} prompts</Text>
                    )}
                  </View>
                  <Text style={styles.packTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.packSub} numberOfLines={2}>
                    {p.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <SectionHeader title="Game Rules & Knobs" icon="sliders" />
      <View style={styles.rulesCard}>
        <RuleRow title="Buzzer" subtitle={seconds === 5 ? 'The classic five seconds' : 'Extra time, kinder for kids'}>
          <Segmented
            options={TIMER_OPTIONS}
            value={seconds as (typeof TIMER_OPTIONS)[number]}
            onChange={setSeconds}
            format={(s) => `${s}s`}
          />
        </RuleRow>
        <RuleRow title="Rounds" subtitle="Everyone gets one turn a round">
          <Stepper value={rounds} onChange={setRounds} min={1} max={10} label="rounds" />
        </RuleRow>
        <RuleRow title="Steals" subtitle="Miss, and the next player can steal the point" last>
          <Toggle value={steals} onChange={setSteals} color={colors.pinkStrong} label="Steals" />
        </RuleRow>
      </View>

      <Button
        label={packIds.length === 0 ? 'PICK AT LEAST ONE PACK' : 'START GAME • 3, 2, 1… ⏱️'}
        size="lg"
        disabled={!canStart}
        onPress={start}
        style={{ marginTop: 28 }}
      />
      <View style={styles.firstTurn}>
        <Icon name="smartphone" size={14} color={colors.coral} />
        <Text style={styles.firstTurnText}>
          First up: <Text style={{ color: colors.coral }}>{players[0]?.name.trim() || fallbackName(0)}</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

function RuleRow({ title, subtitle, children, last }: { title: string; subtitle: string; children: ReactNode; last?: boolean }) {
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
  edition: { fontFamily: fonts.bold, color: colors.pink, fontSize: 11, letterSpacing: 0.8 },
  howTo: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 14 },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playerInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, paddingVertical: 8 },
  addPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addPlayerText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  link: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  packSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  collection: { fontFamily: fonts.bold, color: colors.textMuted, fontSize: 13, marginTop: 14, marginBottom: 10 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  packTileOn: { backgroundColor: '#2A2236', borderColor: colors.primary },
  packTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  packCount: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  packTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16, marginTop: 10 },
  packSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  rulesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  ruleSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 2 },
  firstTurn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  firstTurnText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
});
