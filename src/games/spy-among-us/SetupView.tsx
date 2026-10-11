import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Segmented, Stepper, Toggle } from '../../components/ui';
import { getProfile } from '../../core/store';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, type SpyPlayer, type SpySettings, type VotingMode } from './engine';
import { SPY_PACKS } from './words';

const TIMER_OPTIONS = [180, 300, 480] as const;
const VOTING_OPTIONS = ['secret', 'group'] as const;

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
];

function makePlayer(index: number, name = ''): SpyPlayer {
  const look = PLAYER_LOOKS[index % PLAYER_LOOKS.length];
  return { id: `p${index + 1}`, name, ...look };
}

function defaultPlayers(): SpyPlayer[] {
  return Array.from({ length: 4 }, (_, i) => makePlayer(i, i === 0 ? getProfile().displayName : ''));
}

const fallbackName = (index: number) => `Player ${index + 1}`;

export function SetupView({ initial, onStart }: { initial?: SpySettings; onStart: (settings: SpySettings) => void }) {
  const [players, setPlayers] = useState<SpyPlayer[]>(initial?.players ?? defaultPlayers);
  const [packIds, setPackIds] = useState<string[]>(initial?.packIds ?? SPY_PACKS.map((p) => p.id));
  const [discussSeconds, setDiscussSeconds] = useState<number>(initial?.discussSeconds ?? DEFAULT_SETTINGS.discussSeconds);
  const [rounds, setRounds] = useState(initial?.rounds ?? DEFAULT_SETTINGS.rounds);
  const [voting, setVoting] = useState<VotingMode>(initial?.voting ?? DEFAULT_SETTINGS.voting);
  const [spyHint, setSpyHint] = useState(initial?.spyHint ?? DEFAULT_SETTINGS.spyHint);

  const addPlayer = () => {
    const used = new Set(players.map((p) => p.id));
    let i = 0;
    while (used.has(`p${i + 1}`)) i++;
    setPlayers([...players, makePlayer(i)]);
  };
  const rename = (id: string, name: string) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  const togglePack = (id: string) => setPackIds((ids) => (ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id]));

  const canStart = packIds.length > 0 && players.length >= MIN_PLAYERS;
  const allPacks = packIds.length === SPY_PACKS.length;
  const summary = [
    `${discussSeconds / 60} min`,
    `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
    voting === 'secret' ? 'Secret vote' : 'Point vote',
  ].join(' · ');

  const start = () =>
    onStart({
      ...DEFAULT_SETTINGS,
      players: players.map((p, i) => ({ ...p, name: p.name.trim() || fallbackName(i) })),
      packIds,
      discussSeconds,
      rounds,
      voting,
      spyHint,
    });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionHeader title="Players" />
      <View style={styles.playerList}>
        {players.map((p, i) => (
          <View key={p.id} style={styles.playerRow}>
            <View style={[styles.avatar, { backgroundColor: p.color }]}>
              <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
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
                <Icon name="x" size={16} color={colors.textDim} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {players.length < MAX_PLAYERS && (
        <Pressable onPress={addPlayer} style={styles.addPlayer} accessibilityRole="button">
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text style={styles.addPlayerText}>Add player</Text>
        </Pressable>
      )}

      <SectionHeader
        title="Packs"
        right={
          <Pressable onPress={() => setPackIds(allPacks ? [] : SPY_PACKS.map((p) => p.id))} hitSlop={8}>
            <Text style={styles.link}>{allPacks ? 'Clear all' : 'Select all'}</Text>
          </Pressable>
        }
      />
      {(['kenyan', 'global'] as const).map((collection) => (
        <View key={collection}>
          <Text style={styles.collection}>{collection === 'kenyan' ? 'Kenyan' : 'Global'}</Text>
          <View style={styles.packGrid}>
            {SPY_PACKS.filter((p) => p.collection === collection).map((p) => {
              const on = packIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => togglePack(p.id)}
                  style={[styles.packTile, on && styles.packTileOn]}
                >
                  <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                  <Text style={styles.packTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{ marginTop: 24 }}>
        <Disclosure title="Settings" summary={summary}>
          <RuleRow title="Discussion timer">
            <Segmented
              options={TIMER_OPTIONS}
              value={discussSeconds as (typeof TIMER_OPTIONS)[number]}
              onChange={setDiscussSeconds}
              format={(s) => `${s / 60}m`}
            />
          </RuleRow>
          <RuleRow title="Rounds">
            <Stepper value={rounds} onChange={setRounds} min={1} max={20} label="rounds" />
          </RuleRow>
          <RuleRow title="Voting">
            <Segmented options={VOTING_OPTIONS} value={voting} onChange={setVoting} format={(v) => (v === 'secret' ? 'Secret' : 'Point')} />
          </RuleRow>
          <RuleRow title="Show the spy the pack" last>
            <Toggle value={spyHint} onChange={setSpyHint} label="Show the spy the pack" />
          </RuleRow>
        </Disclosure>
      </View>

      <Button
        label={packIds.length === 0 ? 'Pick at least one pack' : 'Start game'}
        size="lg"
        disabled={!canStart}
        onPress={start}
        style={{ marginTop: 28 }}
      />
    </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text, paddingVertical: 8 },
  addPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addPlayerText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  link: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  collection: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 12, marginTop: 12, marginBottom: 8 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  packTileOn: { borderColor: colors.primary },
  packTitle: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
});
