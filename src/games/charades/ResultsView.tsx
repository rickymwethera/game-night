import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { matchStats, standings, type CharadesAction, type CharadesState } from './engine';

export function ResultsView({
  state,
  dispatch,
  onChooseGame,
}: {
  state: CharadesState;
  dispatch: (a: CharadesAction) => void;
  onChooseGame: () => void;
}) {
  const ranked = standings(state);
  const stats = matchStats(state);
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const winner = ranked[0].team;
  const pts = (n: number) => `${n} ${Math.abs(n) === 1 ? 'point' : 'points'}`;

  const share = () => {
    const lines = ranked.map(({ team, score }, i) => `${i + 1}. ${team.name}: ${pts(score)}`);
    Share.share({
      message: `Game Night Charades\n${tie ? "It's a tie." : `${winner.name} wins.`}\n\n${lines.join('\n')}\n\n${stats.correct} words guessed in ${state.round} rounds.`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <Text style={styles.victory}>{tie ? "It's a tie" : `${winner.name} wins`}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 6 }]}>
          {state.round} {state.round === 1 ? 'round' : 'rounds'} · {stats.correct} words guessed
        </Text>
      </View>

      <View style={styles.list}>
        {ranked.map(({ team, score }, i) => {
          const first = i === 0 && !tie;
          const mvp = stats.mvp[team.id];
          return (
            <View key={team.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: team.color }]}>
                <Text style={{ fontSize: 18 }}>{team.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.name}
                </Text>
                {mvp && (
                  <Text style={styles.mvp} numberOfLines={1}>
                    Top actor: {mvp.actor} ({mvp.correct} {mvp.correct === 1 ? 'word' : 'words'})
                  </Text>
                )}
              </View>
              <Text style={[styles.score, first && { color: colors.primary }]}>{score}</Text>
            </View>
          );
        })}
      </View>

      <Button label="Play again" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 28 }} />
      <Button label="Choose another game" variant="secondary" onPress={onChooseGame} style={{ marginTop: 12 }} />
      <Button label="Share results" variant="ghost" size="sm" onPress={share} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  head: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  victory: { fontFamily: fonts.display, color: colors.text, fontSize: 24, lineHeight: 30, textAlign: 'center' },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: { fontFamily: fonts.semibold, color: colors.textDim, fontSize: 14, width: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  mvp: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 2 },
  score: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 20 },
});
