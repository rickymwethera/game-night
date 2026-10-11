import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon, Pill, SectionHeader, Segmented, Toggle, type } from '../../components/ui';
import { getSoundOn } from '../../core/store';
import { makeTeam, type Team } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import { COUNTRIES } from './countries';
import { countriesIn, DEFAULT_SETTINGS, REGIONS, type FlagsSettings, type RegionId } from './engine';
import { FLAG_IMAGES } from './flagImages';

const FLAG_COUNTS = [5, 10, 15] as const;
const TIMER_OPTIONS = [10, 15, 0] as const;
const ROUND_OPTIONS = [1, 2, 3] as const;
const HERO_FLAGS = ['ke', 'br', 'jp', 'za', 'ca'];

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

  const [world, ...continents] = REGIONS;
  const totalFlags = flagsPerTurn * teams.length * rounds;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={['#1C1F29', '#22263A', '#1F3A4A']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gameCard}
      >
        <View style={styles.gameTop}>
          <Text style={{ fontSize: 30 }}>🏳️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gameTitle}>Guess the Flag</Text>
            <Text style={styles.edition}>{COUNTRIES.length} FLAGS • EVERY COUNTRY</Text>
          </View>
          <Pill label="Ready" icon="zap" bg={colors.surfaceHigh} fg={colors.textMuted} />
        </View>
        <View style={styles.heroFlags}>
          {HERO_FLAGS.map((code, i) => (
            <Image
              key={code}
              source={FLAG_IMAGES[code]}
              style={[styles.heroFlag, { transform: [{ rotate: `${(i - 2) * 6}deg` }], marginTop: Math.abs(i - 2) * 6 }]}
            />
          ))}
        </View>
      </LinearGradient>

      <SectionHeader title="Pick a Region" icon="globe" subtitle="Play the whole world or one continent" />
      <View style={styles.regionGrid}>
        <RegionTile region={world} selected={region === world.id} onPress={() => setRegion(world.id)} wide />
        {continents.map((r) => (
          <RegionTile key={r.id} region={r} selected={region === r.id} onPress={() => setRegion(r.id)} />
        ))}
      </View>

      <SectionHeader title="Players & Teams" icon="users" subtitle="Play solo, or pass the phone between up to 4" />
      <View style={styles.teamList}>
        {teams.map((team, i) => (
          <View key={team.id} style={styles.teamRow}>
            <View style={[styles.teamAvatar, { backgroundColor: team.color }]}>
              <Text style={{ fontSize: 18 }}>{team.emoji}</Text>
            </View>
            <TextInput
              value={team.name}
              onChangeText={(name) => setTeams((ts) => ts.map((t) => (t.id === team.id ? { ...t, name } : t)))}
              style={[styles.teamName, { color: team.color }]}
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
                <Icon name="x" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {teams.length < 4 && (
        <Pressable onPress={addTeam} style={styles.addTeam} accessibilityRole="button">
          <Icon name="plus-circle" size={16} color={colors.primary} />
          <Text style={styles.addTeamText}>Add a player or team</Text>
        </Pressable>
      )}

      <SectionHeader title="Game Rules & Knobs" icon="sliders" />
      <View style={styles.rulesCard}>
        <RuleRow title="Flags per Turn" subtitle="Each team answers in a row">
          <Segmented
            options={FLAG_COUNTS}
            value={flagsPerTurn as (typeof FLAG_COUNTS)[number]}
            onChange={setFlagsPerTurn}
          />
        </RuleRow>
        <RuleRow title="Answer Timer" subtitle="Seconds to pick a country">
          <Segmented
            options={TIMER_OPTIONS}
            value={answerSeconds as (typeof TIMER_OPTIONS)[number]}
            onChange={setAnswerSeconds}
            format={(s) => (s === 0 ? 'Off' : `${s}s`)}
          />
        </RuleRow>
        <RuleRow title="Rounds" subtitle="Turns per team">
          <Segmented options={ROUND_OPTIONS} value={rounds as (typeof ROUND_OPTIONS)[number]} onChange={setRounds} />
        </RuleRow>
        <RuleRow title="Buzz & Haptics" subtitle="Buzz on right and wrong answers" last>
          <Toggle value={soundOn} onChange={setSoundOn} label="Buzz and haptics" />
        </RuleRow>
      </View>

      <Button label="START GAME 🚀" size="lg" onPress={start} style={{ marginTop: 28 }} />
      <View style={styles.firstTurn}>
        <Icon name="flag" size={14} color={colors.coral} />
        <Text style={styles.firstTurnText}>
          {totalFlags} flags in all • {teams[0].name} goes first
        </Text>
      </View>
    </ScrollView>
  );
}

function RegionTile({
  region,
  selected,
  onPress,
  wide,
}: {
  region: (typeof REGIONS)[number];
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  const count = countriesIn(region.id).length;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.regionTile, wide && styles.regionWide, selected && styles.regionOn]}
    >
      <View style={styles.regionTop}>
        <Text style={{ fontSize: wide ? 28 : 22 }}>{region.emoji}</Text>
        {selected ? (
          <View style={styles.check}>
            <Icon name="check" size={12} color={colors.onPrimary} />
          </View>
        ) : (
          <Text style={styles.regionCount}>{count} flags</Text>
        )}
      </View>
      <Text style={[styles.regionTitle, wide && { fontSize: 20 }]} numberOfLines={1}>
        {region.title}
      </Text>
      <Text style={styles.regionSub} numberOfLines={1}>
        {selected ? `${count} flags • ${region.tag}` : region.tag}
      </Text>
    </Pressable>
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
  heroFlags: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18, marginBottom: 4 },
  heroFlag: { width: 52, height: 39, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  regionTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  regionWide: { flexBasis: '100%', padding: 18 },
  regionOn: { backgroundColor: '#2A2236', borderColor: colors.primary },
  regionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  regionCount: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  regionTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16, marginTop: 10 },
  regionSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, marginTop: 2 },
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
  teamAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  teamName: { flex: 1, fontFamily: fonts.display, fontSize: 19, padding: 0 },
  addTeam: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addTeamText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  rulesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  ruleTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  ruleSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 2 },
  firstTurn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  firstTurnText: { ...type.label, textTransform: 'none', letterSpacing: 0.3, fontSize: 12, color: colors.textMuted },
});
