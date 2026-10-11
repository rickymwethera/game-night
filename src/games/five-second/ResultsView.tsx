import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { matchStats, standings, type FiveAction, type FiveState } from './engine';

export function ResultsView({
  state,
  dispatch,
  onChooseGame,
}: {
  state: FiveState;
  dispatch: (a: FiveAction) => void;
  onChooseGame: () => void;
}) {
  const ranked = standings(state);
  const top = ranked[0].score;
  const winners = ranked.filter((r) => r.score === top).map((r) => r.player);
  const tie = winners.length > 1;
  const headline = !tie
    ? `${winners[0].name} wins`
    : winners.length === 2
      ? `${winners[0].name} and ${winners[1].name} tie`
      : `${winners.length}-way tie`;

  const share = () => {
    const stats = matchStats(state);
    const lines = ranked.map(({ player, score }, i) => `${i + 1}. ${player.emoji} ${player.name}: ${score} pts`);
    Share.share({
      message: `Game Night 5-Second Challenge\n${headline}\n\n${lines.join('\n')}\n\n${stats.nailed} of ${stats.attempts} tries beat the buzzer.`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.victory}>{headline}</Text>

      <View style={styles.list}>
        {ranked.map(({ player, score }, i) => (
          <View key={player.id} style={[styles.row, i > 0 && styles.divider]}>
            <Text style={styles.place}>{i + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: player.color }]}>
              <Text style={{ fontSize: 18 }}>{player.emoji}</Text>
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
  victory: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 24, textAlign: 'center', marginTop: 24, marginBottom: 24 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  place: { width: 18, fontFamily: fonts.semibold, color: colors.textDim, fontSize: 14, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  score: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
});
