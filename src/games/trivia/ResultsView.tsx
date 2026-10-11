import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Disclosure, SectionHeader, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { getQuestion, matchStats, standings, type TriviaAction, type TriviaState } from './engine';
import { LeaderboardCard } from './LeaderboardCard';
import { leaderboardActions, useLeaderboard } from './leaderboard';

export function ResultsView({
  state,
  dispatch,
  newEntryIds,
  onChangeSettings,
  onChooseGame,
}: {
  state: TriviaState;
  dispatch: (a: TriviaAction) => void;
  /** Leaderboard entries saved from this game, to highlight them. */
  newEntryIds: Set<string>;
  onChangeSettings: () => void;
  onChooseGame: () => void;
}) {
  const ranked = standings(state);
  const stats = matchStats(state);
  const leaderboard = useLeaderboard();
  const solo = ranked.length === 1;
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const winner = ranked[0].team;

  const topSpot = leaderboard.findIndex((e) => newEntryIds.has(e.id));
  const headline = solo ? `${ranked[0].score} points` : tie ? "It's a tie" : `${winner.name} wins`;
  const subline = [
    stats.total > 0 ? `${stats.correct} of ${stats.total} answered correctly` : 'No questions played',
    topSpot === 0 ? 'new high score' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const share = () => {
    const lines = ranked.map(
      ({ team, score }, i) => `${i + 1}. ${team.emoji} ${team.name}: ${score} pts (${stats.perTeam[team.id].correct}/${stats.perTeam[team.id].total})`,
    );
    Share.share({
      message: `Game Night: Trivia\n${solo ? '' : tie ? "It's a tie!\n" : `${winner.name} wins!\n`}\n${lines.join('\n')}`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <Text style={styles.victory}>{headline}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 4 }]}>{subline}</Text>
      </View>

      <View style={styles.scoreList}>
        {ranked.map(({ team, score }, i) => {
          const t = stats.perTeam[team.id];
          return (
            <View key={team.id} style={[styles.scoreRow, i > 0 && styles.divider]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.teamAvatar, { backgroundColor: team.color }]}>
                <Text style={{ fontSize: 16 }}>{team.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.name}
                </Text>
                <Text style={styles.meta}>
                  {t.correct} of {t.total} right
                </Text>
              </View>
              <Text style={[styles.score, i === 0 && !tie && { color: colors.primary }]}>{score}</Text>
            </View>
          );
        })}
      </View>

      {stats.missed.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Disclosure title="Missed answers" summary={`${stats.missed.length}`}>
            {stats.missed.map((id) => {
              const q = getQuestion(id);
              return (
                <View key={id} style={styles.missedItem}>
                  <Text style={styles.missedQ}>{q.q}</Text>
                  <Text style={styles.missedA}>{q.a}</Text>
                </View>
              );
            })}
          </Disclosure>
        </View>
      )}

      <SectionHeader title="Leaderboard" />
      <LeaderboardCard entries={leaderboard} highlight={newEntryIds} onClear={leaderboardActions.clear} />

      <Button label="Play again" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 28 }} />
      <Button label="Change settings" variant="secondary" onPress={onChangeSettings} style={{ marginTop: 12 }} />
      <Button label="Choose another game" variant="secondary" onPress={onChooseGame} style={{ marginTop: 12 }} />
      <Button label="Share scores" variant="ghost" size="sm" onPress={share} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  head: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  victory: { fontFamily: fonts.display, color: colors.text, fontSize: 24, lineHeight: 30, textAlign: 'center' },
  scoreList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.surfaceHighest },
  rank: { width: 16, fontFamily: fonts.semibold, color: colors.textDim, fontSize: 14, textAlign: 'center' },
  teamAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  meta: { fontFamily: fonts.body, color: colors.textDim, fontSize: 12, marginTop: 1 },
  score: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  missedItem: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.surfaceHighest },
  missedQ: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13 },
  missedA: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15, marginTop: 2 },
});
