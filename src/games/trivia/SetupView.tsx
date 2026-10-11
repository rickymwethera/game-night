import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon, Pill, SectionHeader, Segmented, Toggle, type } from '../../components/ui';
import { getSoundOn } from '../../core/store';
import { makeTeam, type Team } from '../../core/types';
import { colors, fonts, radius } from '../../theme';
import { DEFAULT_SETTINGS, type TriviaSettings } from './engine';
import { LeaderboardCard } from './LeaderboardCard';
import { leaderboardActions, useLeaderboard } from './leaderboard';
import { TRIVIA_PACKS, type TriviaPack } from './packs';

const QUESTION_COUNTS = [5, 10, 15] as const;
const TIMER_OPTIONS = [10, 20, 0] as const;
const ROUND_OPTIONS = [1, 2, 3] as const;
const TOTAL_QUESTIONS = TRIVIA_PACKS.reduce((n, p) => n + p.questions.length, 0);

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
  const leaderboard = useLeaderboard();

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

  const poolSize = TRIVIA_PACKS.filter((p) => packIds.includes(p.id)).reduce((n, p) => n + p.questions.length, 0);
  const totalQuestions = questionsPerTurn * teams.length * rounds;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={['#1C1F29', '#2A2445', '#493D73']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gameCard}
      >
        <View style={styles.gameTop}>
          <Text style={{ fontSize: 30 }}>🧠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gameTitle}>Trivia Night</Text>
            <Text style={styles.edition}>{TOTAL_QUESTIONS} QUESTIONS • WORKS OFFLINE</Text>
          </View>
          <Pill label="Ready" icon="zap" bg={colors.surfaceHigh} fg={colors.textMuted} />
        </View>
        <View style={styles.heroPacks}>
          {TRIVIA_PACKS.map((p, i) => (
            <View key={p.id} style={[styles.heroPack, { transform: [{ rotate: `${(i - 2.5) * 5}deg` }] }]}>
              <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <SectionHeader
        title="Pick Your Packs"
        icon="layers"
        subtitle="Questions are mixed from every pack you pick"
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
        <RuleRow title="Questions per Turn" subtitle="Each team answers in a row">
          <Segmented
            options={QUESTION_COUNTS}
            value={questionsPerTurn as (typeof QUESTION_COUNTS)[number]}
            onChange={setQuestionsPerTurn}
          />
        </RuleRow>
        <RuleRow title="Answer Timer" subtitle="Faster right answers earn bonus points">
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

      <Button
        label={packIds.length === 0 ? 'PICK A PACK TO START' : 'START GAME 🚀'}
        size="lg"
        onPress={start}
        disabled={packIds.length === 0}
        style={{ marginTop: 28 }}
      />
      <View style={styles.firstTurn}>
        <Icon name="help-circle" size={14} color={colors.coral} />
        <Text style={styles.firstTurnText}>
          {packIds.length === 0
            ? 'Pick at least one pack'
            : `${totalQuestions} questions from a pool of ${poolSize} • ${teams[0].name} goes first`}
        </Text>
      </View>

      <SectionHeader title="Leaderboard" icon="bar-chart-2" subtitle="Best scores on this phone" />
      <LeaderboardCard entries={leaderboard} onClear={leaderboardActions.clear} />
    </ScrollView>
  );
}

function PackTile({ pack, selected, onPress }: { pack: TriviaPack; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.packTile, selected && styles.packOn]}
    >
      <View style={styles.packTop}>
        <Text style={{ fontSize: 24 }}>{pack.emoji}</Text>
        {selected ? (
          <View style={styles.check}>
            <Icon name="check" size={12} color={colors.onPrimary} />
          </View>
        ) : (
          <Text style={styles.packCount}>{pack.questions.length} Qs</Text>
        )}
      </View>
      <Text style={styles.packTitle} numberOfLines={1}>
        {pack.title}
      </Text>
      <Text style={styles.packSub} numberOfLines={1}>
        {pack.tag}
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
  heroPacks: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18, marginBottom: 4 },
  heroPack: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  packOn: { backgroundColor: '#2A2236', borderColor: colors.primary },
  packTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  packCount: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  packTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16, marginTop: 10 },
  packSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, marginTop: 2 },
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
