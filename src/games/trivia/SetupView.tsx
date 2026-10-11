import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Segmented, Toggle } from '../../components/ui';
import { getSoundOn } from '../../core/store';
import { makeTeam, type Team } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, type TriviaSettings } from './engine';
import { TRIVIA_PACKS, type TriviaPack } from './packs';

const QUESTION_COUNTS = [5, 10, 15] as const;
const TIMER_OPTIONS = [10, 20, 0] as const;
const ROUND_OPTIONS = [1, 2, 3] as const;

export interface SetupResult {
  settings: TriviaSettings;
  soundOn: boolean;
}

export function SetupView({ initial, onStart }: { initial?: TriviaSettings; onStart: (result: SetupResult) => void }) {
  const [teams, setTeams] = useState<Team[]>(initial?.teams ?? [makeTeam(0), makeTeam(1)]);
  const [packIds, setPackIds] = useState<string[]>(initial?.packIds ?? DEFAULT_SETTINGS.packIds);
  const [questionsPerTurn, setQuestionsPerTurn] = useState<number>(initial?.questionsPerTurn ?? DEFAULT_SETTINGS.questionsPerTurn);
  const [answerSeconds, setAnswerSeconds] = useState<number>(initial?.answerSeconds ?? DEFAULT_SETTINGS.answerSeconds);
  const [rounds, setRounds] = useState<number>(initial?.rounds ?? DEFAULT_SETTINGS.rounds);
  const [soundOn, setSoundOn] = useState(getSoundOn);

  const allPicked = packIds.length === TRIVIA_PACKS.length;
  const togglePack = (id: string) =>
    setPackIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : TRIVIA_PACKS.map((p) => p.id).filter((p) => p === id || ids.includes(p))));

  const addTeam = () => {
    const used = new Set(teams.map((t) => t.id));
    let i = 0;
    while (used.has(`team-${i + 1}`)) i++;
    setTeams([...teams, makeTeam(i)]);
  };

  const start = () =>
    onStart({
      soundOn,
      settings: {
        teams: teams.map((t, i) => ({ ...t, name: t.name.trim() || makeTeam(i).name })),
        packIds,
        questionsPerTurn,
        answerSeconds,
        rounds,
      },
    });

  const summary = [
    `${questionsPerTurn} questions`,
    answerSeconds === 0 ? 'No timer' : `${answerSeconds}s`,
    `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
  ].join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionHeader
        title="Packs"
        right={
          <Button
            label={allPicked ? 'Clear' : 'All'}
            variant="ghost"
            size="sm"
            onPress={() => setPackIds(allPicked ? [] : TRIVIA_PACKS.map((p) => p.id))}
          />
        }
      />
      <View style={styles.packGrid}>
        {TRIVIA_PACKS.map((p) => (
          <PackTile key={p.id} pack={p} selected={packIds.includes(p.id)} onPress={() => togglePack(p.id)} />
        ))}
      </View>

      <SectionHeader title="Teams" />
      <View style={styles.teamList}>
        {teams.map((team, i) => (
          <View key={team.id} style={styles.teamRow}>
            <View style={[styles.teamAvatar, { backgroundColor: team.color }]}>
              <Text style={{ fontSize: 16 }}>{team.emoji}</Text>
            </View>
            <TextInput
              value={team.name}
              onChangeText={(name) => setTeams((ts) => ts.map((t) => (t.id === team.id ? { ...t, name } : t)))}
              style={styles.teamName}
              maxLength={18}
              placeholder={makeTeam(i).name}
              placeholderTextColor={colors.textDim}
              accessibilityLabel="Team or player name"
            />
            {teams.length > 1 && (
              <Pressable
                onPress={() => setTeams(teams.filter((t) => t.id !== team.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${team.name}`}
              >
                <Icon name="x" size={16} color={colors.textDim} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {teams.length < 4 && (
        <Pressable onPress={addTeam} style={styles.addTeam} accessibilityRole="button">
          <Icon name="plus" size={16} color={colors.primary} />
          <Text style={styles.addTeamText}>Add team</Text>
        </Pressable>
      )}

      <View style={{ marginTop: 28 }}>
        <Disclosure title="Settings" summary={summary}>
          <RuleRow title="Questions per turn">
            <Segmented
              options={QUESTION_COUNTS}
              value={questionsPerTurn as (typeof QUESTION_COUNTS)[number]}
              onChange={setQuestionsPerTurn}
            />
          </RuleRow>
          <RuleRow title="Answer timer">
            <Segmented
              options={TIMER_OPTIONS}
              value={answerSeconds as (typeof TIMER_OPTIONS)[number]}
              onChange={setAnswerSeconds}
              format={(s) => (s === 0 ? 'Off' : `${s}s`)}
            />
          </RuleRow>
          <RuleRow title="Rounds">
            <Segmented options={ROUND_OPTIONS} value={rounds as (typeof ROUND_OPTIONS)[number]} onChange={setRounds} />
          </RuleRow>
          <RuleRow title="Haptics" last>
            <Toggle value={soundOn} onChange={setSoundOn} label="Buzz and haptics" />
          </RuleRow>
        </Disclosure>
      </View>

      <Button
        label={packIds.length === 0 ? 'Pick a pack to start' : 'Start game'}
        size="lg"
        onPress={start}
        disabled={packIds.length === 0}
        style={{ marginTop: 28 }}
      />
    </ScrollView>
  );
}

function PackTile({ pack, selected, onPress }: { pack: TriviaPack; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={pack.title}
      onPress={onPress}
      style={[styles.packTile, selected && styles.packOn]}
    >
      <Text style={{ fontSize: 20 }}>{pack.emoji}</Text>
      <Text style={styles.packTitle} numberOfLines={2}>
        {pack.title}
      </Text>
    </Pressable>
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
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  packOn: { borderColor: colors.primary },
  packTitle: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  teamList: { gap: 8 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  teamAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  teamName: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16, padding: 0 },
  addTeam: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addTeamText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
});
