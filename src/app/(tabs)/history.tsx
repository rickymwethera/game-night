import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Icon, Pill, Screen, SectionHeader, type } from '../../components/ui';
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
      <AppHeader variant="brand" section="HISTORY" />
      <ScrollView contentContainerStyle={styles.content}>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.trophy}>
              <Icon name="award" size={40} color={colors.coral} />
            </View>
            <Text style={styles.emptyTitle}>No champions yet</Text>
            <Text style={[type.body, { textAlign: 'center' }]}>
              Finish a game and the winners land here, ready for bragging rights.
            </Text>
            <Button label="Start a game" iconRight="arrow-right" onPress={() => router.push('/games/charades')} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <>
            <SectionHeader
              title="Hall of Fame"
              icon="award"
              subtitle={`${history.length} ${history.length === 1 ? 'game' : 'games'} played on this phone`}
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
        <Text style={styles.game}>
          {getGame(record.gameId).emoji} {getGame(record.gameId).title}
        </Text>
        <Text style={type.label}>{formatDate(record.playedAt)}</Text>
      </View>
      <Text style={styles.winner}>{tie ? "It's a tie!" : `${ranked[0].emoji} ${ranked[0].name} won`}</Text>
      <View style={styles.scores}>
        {ranked.map((t) => (
          <Pill key={t.name} label={`${t.name} ${t.score}`} bg={colors.surfaceLow} fg={t.color} />
        ))}
        <Pill label={`${record.rounds} rounds`} icon="repeat" bg={colors.surfaceLow} fg={colors.textMuted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  trophy: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.coral,
    shadowOpacity: 0.35,
    shadowRadius: 30,
  },
  emptyTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 26, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  game: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
  winner: { fontFamily: fonts.display, color: colors.text, fontSize: 21, marginTop: 8 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
});
