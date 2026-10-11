import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Disclosure, Icon, SectionHeader, Segmented, Toggle } from '../../components/ui';
import { getSoundOn } from '../../core/store';
import { makeTeam, type Team } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, REGIONS, type FlagsSettings, type RegionId } from './engine';

const FLAG_COUNTS = [5, 10, 15] as const;
const TIMER_OPTIONS = [10, 15, 0] as const;
const ROUND_OPTIONS = [1, 2, 3] as const;

export interface SetupResult {
  settings: FlagsSettings;
  soundOn: boolean;
}

export function SetupView({ initial, onStart }: { initial?: FlagsSettings; onStart: (result: SetupResult) => void }) {
  const [teams, setTeams] = useState<Team[]>(initial?.teams ?? [makeTeam(0), makeTeam(1)]);
  const [region, setRegion] = useState<RegionId>(initial?.region ?? DEFAULT_SETTINGS.region);
  const [flagsPerTurn, setFlagsPerTurn] = useState<number>(initial?.flagsPerTurn ?? DEFAULT_SETTINGS.flagsPerTurn);
  const [answerSeconds, setAnswerSeconds] = useState<number>(initial?.answerSeconds ?? DEFAULT_SETTINGS.answerSeconds);
  const [rounds, setRounds] = useState<number>(initial?.rounds ?? DEFAULT_SETTINGS.rounds);
  const [soundOn, setSoundOn] = useState(getSoundOn);

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
        region,
        flagsPerTurn,
        answerSeconds,
        rounds,
      },
    });

  const summary = [
    `${flagsPerTurn} flags`,
    answerSeconds === 0 ? 'no timer' : `${answerSeconds}s`,
    `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
  ].join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text style={styles.addTeamText}>Add team</Text>
        </Pressable>
      )}

      <SectionHeader title="Continent" />
      <View style={styles.regionGrid}>
        {REGIONS.map((r) => (
          <RegionTile key={r.id} region={r} selected={region === r.id} onPress={() => setRegion(r.id)} />
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <Disclosure title="Settings" summary={summary}>
          <RuleRow title="Flags per turn">
            <Segmented
              options={FLAG_COUNTS}
              value={flagsPerTurn as (typeof FLAG_COUNTS)[number]}
              onChange={setFlagsPerTurn}
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

      <Button label="Start game" size="lg" onPress={start} style={{ marginTop: 28 }} />
    </ScrollView>
  );
}

function RegionTile({
  region,
  selected,
  onPress,
}: {
  region: (typeof REGIONS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.regionTile, selected && styles.regionOn]}
    >
      <Text style={{ fontSize: 18 }}>{region.emoji}</Text>
      <Text style={[styles.regionTitle, selected && { color: colors.primary }]} numberOfLines={1}>
        {region.title}
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
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionTile: {
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
  regionOn: { borderColor: colors.primary },
  regionTitle: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
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
  addTeam: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  addTeamText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
});
