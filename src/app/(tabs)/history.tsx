import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Icon, Screen, SectionHeader, type } from '../../components/ui';
import { appActions, useAppState, type GameRecord } from '../../core/store';
import { getGame } from '../../games/registry';
import { colors, fonts, radius } from '../../theme';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const history = useAppState((s) => s.history);
  return (
    <Screen>
      <AppHeader variant="brand" />
      <ScrollView contentContainerStyle={styles.content}>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="award" size={32} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No games yet</Text>
            <Text style={[type.body, { textAlign: 'center' }]}>Finished games show up here.</Text>
            <Button label="Start a game" variant="secondary" onPress={() => router.navigate('/games')} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <>
            <SectionHeader
              title="History"
              right={<Button label="Clear" variant="ghost" size="sm" onPress={appActions.clearHistory} />}
            />
            {history.map((g) => (
              <HistoryCard key={g.id} record={g} />
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function HistoryCard({ record }: { record: GameRecord }) {
  const ranked = [...record.teams].sort((a, b) => b.score - a.score);
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.game}>{getGame(record.gameId).title}</Text>
        <Text style={type.label}>{formatDate(record.playedAt)}</Text>
      </View>
      <Text style={styles.winner}>{tie ? "It's a tie" : `${ranked[0].name} won`}</Text>
      <Text style={styles.scores}>{ranked.map((t) => `${t.name} ${t.score}`).join('  ·  ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 20, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  game: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
  winner: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18, marginTop: 6 },
  scores: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
