import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { matchStats, standings, type SpyAction, type SpyState } from './engine';

export function ResultsView({
  state,
  dispatch,
  onChooseGame,
}: {
  state: SpyState;
  dispatch: (a: SpyAction) => void;
  onChooseGame: () => void;
}) {
  const ranked = standings(state);
  const top = ranked[0].score;
  const winners = ranked.filter((r) => r.score === top).map((r) => r.player);
  const tie = winners.length > 1;
  const played = state.history.length;

  const headline = !tie
    ? `${winners[0].name} wins`
    : winners.length === 2
      ? `${winners[0].name} and ${winners[1].name} tie`
      : `${winners.length}-way tie`;

  const share = () => {
    const stats = matchStats(state);
    const lines = ranked.map(({ player, score }, i) => `${i + 1}. ${player.name}: ${score} pts`);
    Share.share({
      message: `Game Night: Spy Among Us\n${headline}\n\n${lines.join('\n')}\n\nThe spy won ${stats.spyWins} of ${played} rounds.`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.victory}>{headline}</Text>
      <Text style={styles.sub}>
        {played} {played === 1 ? 'round' : 'rounds'} played
      </Text>

      <View style={styles.list}>
        {ranked.map(({ player, score }, i) => (
          <View key={player.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <Text style={styles.place}>{i + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: player.color }]}>
              <Text style={{ fontSize: 16 }}>{player.emoji}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
            </Text>
            <Text style={[styles.score, score === top && { color: colors.primary }]}>{score}</Text>
          </View>
        ))}
      </View>

      <Button label="Play again" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 28 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button label="Share" variant="secondary" onPress={share} style={{ flex: 1 }} />
        <Button label="Other games" variant="secondary" onPress={onChooseGame} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  victory: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 24, textAlign: 'center', marginTop: 24 },
  sub: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14, textAlign: 'center', marginTop: 6 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16, marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.surfaceHighest },
  place: { width: 18, fontFamily: fonts.medium, color: colors.textDim, fontSize: 15, textAlign: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  score: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
});
