import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Segmented, Stepper, Toggle } from '../../components/ui';
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
      <SectionHeader title="Players" />
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
                <Icon name="x" size={16} color={colors.textDim} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {players.length < MAX_PLAYERS && (
        <Pressable onPress={addPlayer} style={styles.addPlayer} accessibilityRole="button">
          <Icon name="plus" size={16} color={colors.primary} />
          <Text style={styles.addPlayerText}>Add player</Text>
        </Pressable>
      )}

      <SectionHeader
        title="Packs"
        right={
          <Pressable
            onPress={() => setPackIds(allPacks ? [] : FIVE_PACKS.map((p) => p.id))}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.link}>{allPacks ? 'Clear all' : 'Select all'}</Text>
          </Pressable>
        }
      />
      {(['kenyan', 'global'] as const).map((collection) => (
        <View key={collection}>
          <Text style={styles.collection}>{collection === 'kenyan' ? 'Kenyan' : 'Global'}</Text>
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
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                  <Text style={styles.packTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{ height: 16 }} />
      <Disclosure title="Settings" summary={`${seconds}s · ${rounds} ${rounds === 1 ? 'round' : 'rounds'} · steals ${steals ? 'on' : 'off'}`}>
        <RuleRow title="Timer">
          <Segmented
            options={TIMER_OPTIONS}
            value={seconds as (typeof TIMER_OPTIONS)[number]}
            onChange={setSeconds}
            format={(s) => `${s}s`}
          />
        </RuleRow>
        <RuleRow title="Rounds">
          <Stepper value={rounds} onChange={setRounds} min={1} max={10} label="rounds" />
        </RuleRow>
        <RuleRow title="Steals" last>
          <Toggle value={steals} onChange={setSteals} label="Steals" />
        </RuleRow>
      </Disclosure>

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
    paddingVertical: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playerInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, paddingVertical: 8 },
  addPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addPlayerText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  link: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  collection: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 10 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  packTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  packTileOn: { borderColor: colors.primary },
  packTitle: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleTitle: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
});
