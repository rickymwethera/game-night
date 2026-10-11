import { Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Disclosure } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { getCountry, getRegion, matchStats, standings, type FlagsAction, type FlagsState } from './engine';
import { FLAG_IMAGES } from './flagImages';

export function ResultsView({
  state,
  dispatch,
  onChangeSettings,
  onChooseGame,
}: {
  state: FlagsState;
  dispatch: (a: FlagsAction) => void;
  onChangeSettings: () => void;
  onChooseGame: () => void;
}) {
  const ranked = standings(state);
  const stats = matchStats(state);
  const solo = ranked.length === 1;
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const winner = ranked[0].team;
  const region = getRegion(state.settings.region);

  const headline = solo ? `${stats.correct} out of ${stats.total}` : tie ? "It's a tie" : `${winner.name} wins`;

  const share = () => {
    const lines = ranked.map(({ team, score }, i) => `${i + 1}. ${team.emoji} ${team.name}: ${score}/${stats.perTeam[team.id].total}`);
    Share.share({
      message: `Game Night: Guess the Flag (${region.title})\n${solo ? '' : tie ? "It's a tie!\n" : `${winner.name} wins!\n`}\n${lines.join('\n')}`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.victory}>{headline}</Text>

      <View style={styles.scoreList}>
        {ranked.map(({ team, score }, i) => {
          const t = stats.perTeam[team.id];
          return (
            <View key={team.id} style={[styles.teamRow, i > 0 && styles.divider]}>
              <View style={[styles.teamAvatar, { backgroundColor: team.color }]}>
                <Text style={{ fontSize: 16 }}>{team.emoji}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={styles.score}>
                {score}
                <Text style={styles.scoreOf}>/{t.total}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      {stats.missed.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Disclosure title="Missed flags" summary={`${stats.missed.length}`}>
            <View style={styles.missedGrid}>
              {stats.missed.map((code) => (
                <View key={code} style={styles.missedItem}>
                  <Image source={FLAG_IMAGES[code]} style={styles.missedFlag} />
                  <Text style={styles.missedName} numberOfLines={2}>
                    {getCountry(code).name}
                  </Text>
                </View>
              ))}
            </View>
          </Disclosure>
        </View>
      )}

      <Button label="Play again" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 28 }} />
      <Button label="Change settings" variant="secondary" onPress={onChangeSettings} style={{ marginTop: 12 }} />
      <Button label="Choose another game" variant="secondary" onPress={onChooseGame} style={{ marginTop: 12 }} />
      <Button label="Share" variant="ghost" icon="share-2" onPress={share} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  victory: { fontFamily: fonts.display, color: colors.text, fontSize: 24, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  scoreList: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.surfaceHighest },
  teamAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamName: { flex: 1, fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  score: { fontFamily: fonts.bold, color: colors.text, fontSize: 18 },
  scoreOf: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14 },
  missedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  missedItem: { width: '31%', alignItems: 'center' },
  missedFlag: { width: 64, height: 48, borderRadius: 6 },
  missedName: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
