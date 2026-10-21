import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Stepper } from '../../components/ui';
import { getProfile, useAppState } from '../../core/store';
import { colors, fonts, radius } from '../../theme';
import { CATEGORIES, type CategoryId } from './cards';
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, type DarePlayer, type DareSettings } from './engine';

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

function makePlayer(index: number, name = ''): DarePlayer {
  const look = PLAYER_LOOKS[index % PLAYER_LOOKS.length];
  return { id: `p${index + 1}`, name, ...look };
}

function defaultPlayers(): DarePlayer[] {
  return Array.from({ length: 3 }, (_, i) => makePlayer(i, i === 0 ? getProfile().displayName : ''));
}

const fallbackName = (index: number) => `Player ${index + 1}`;

export function SetupView({ initial, onStart }: { initial?: DareSettings; onStart: (settings: DareSettings) => void }) {
  const adult = useAppState((s) => s.adultContent);
  const [players, setPlayers] = useState<DarePlayer[]>(initial?.players ?? defaultPlayers);
  const [categoryIds, setCategoryIds] = useState<CategoryId[]>(initial?.categoryIds ?? CATEGORIES.map((c) => c.id));
  const [rounds, setRounds] = useState(initial?.rounds ?? DEFAULT_SETTINGS.rounds);

  const addPlayer = () => {
    const used = new Set(players.map((p) => p.id));
    let i = 0;
    while (used.has(`p${i + 1}`)) i++;
    setPlayers([...players, makePlayer(i)]);
  };
  const rename = (id: string, name: string) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  // Keep the wheel in the same order as the list, whatever order they were tapped in.
  const toggleCategory = (id: CategoryId) =>
    setCategoryIds((ids) => CATEGORIES.map((c) => c.id).filter((c) => (c === id ? !ids.includes(id) : ids.includes(c))));

  const canStart = categoryIds.length > 0 && players.length >= MIN_PLAYERS;

  const start = () =>
    onStart({
      players: players.map((p, i) => ({ ...p, name: p.name.trim() || fallbackName(i) })),
      categoryIds,
      rounds,
      adult,
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

      <SectionHeader title="On the wheel" />
      <View style={styles.grid}>
        {CATEGORIES.map((c) => {
          const on = categoryIds.includes(c.id);
          return (
            <Pressable
              key={c.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleCategory(c.id)}
              style={[styles.tile, on && styles.tileOn]}
            >
              <View style={[styles.swatch, { backgroundColor: c.color }]}>
                <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>{c.title}</Text>
                <Text style={styles.tileText} numberOfLines={2}>
                  {c.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 16 }} />
      <Disclosure
        title="Settings"
        summary={`${rounds} ${rounds === 1 ? 'round' : 'rounds'} · ${adult ? '18+ cards on' : 'clean cards'}`}
      >
        <RuleRow title="Rounds">
          <Stepper value={rounds} onChange={setRounds} min={1} max={10} label="rounds" />
        </RuleRow>
        <RuleRow title="18+ cards" last>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8} accessibilityRole="button" style={styles.adultLink}>
            <Text style={styles.adultValue}>{adult ? 'On' : 'Off'}</Text>
            <Text style={styles.link}>Change in Profile</Text>
          </Pressable>
        </RuleRow>
      </Disclosure>

      <Button
        label={categoryIds.length === 0 ? 'Put something on the wheel' : 'Start game'}
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
  grid: { gap: 8 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tileOn: { borderColor: colors.primary },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  tileText: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleTitle: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  adultLink: { alignItems: 'flex-end' },
  adultValue: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
});
