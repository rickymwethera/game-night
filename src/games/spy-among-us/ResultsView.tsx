import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Pill, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { getPlayer, matchStats, spyWon, standings, type SpyAction, type SpyState } from './engine';

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
  const stats = matchStats(state);
  const top = ranked[0].score;
  const winners = ranked.filter((r) => r.score === top).map((r) => r.player);
  const tie = winners.length > 1;
  const played = state.history.length;

  const share = () => {
    const lines = ranked.map(({ player, score }, i) => `${i + 1}. ${player.emoji} ${player.name}: ${score} pts`);
    Share.share({
      message: `🕵🏾 Game Night Spy Among Us\n${tie ? "It's a tie!" : `${winners[0].name} wins!`}\n\n${lines.join('\n')}\n\nThe spy won ${stats.spyWins} of ${played} rounds.`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={styles.halo}>
          <Text style={{ fontSize: 40 }}>{tie ? '🤝' : '🏆'}</Text>
        </View>
        <Pill
          label={tie ? 'DEAD HEAT' : 'MASTER OF DECEPTION'}
          icon="award"
          bg={colors.orange}
          fg="#FFE4D8"
          style={{ alignSelf: 'center', marginTop: 18 }}
        />
        <Text style={styles.victory}>
          {!tie
            ? `${winners[0].name.toUpperCase()} WINS! 🏆`
            : winners.length === 2
              ? `${winners[0].name.toUpperCase()} & ${winners[1].name.toUpperCase()} TIE!`
              : `${winners.length}-WAY TIE AT THE TOP!`}
        </Text>
        <View style={styles.statsRow}>
          <Stat value={played} label={played === 1 ? 'Round' : 'Rounds'} color={colors.text} />
          <Stat value={stats.groupWins} label="Spies caught" color={colors.primary} />
          <Stat value={stats.spyWins} label="Spies escaped" color={colors.pink} />
        </View>
      </View>

      {ranked.map(({ player, score }, i) => {
        const first = score === top;
        return (
          <View key={player.id} style={[styles.row, first && styles.rowFirst]}>
            <Text style={styles.place}>{i + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: player.color }]}>
              <Text style={{ fontSize: 20 }}>{player.emoji}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: first ? colors.primaryStrong : colors.surfaceHigh }]}>
              <Text style={[styles.badgeText, { color: first ? '#1A0050' : colors.text }]}>
                {score} {score === 1 ? 'PT' : 'PTS'}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.highlightsHead}>
        <Icon name="eye" size={18} color={colors.pink} />
        <Text style={styles.highlightsTitle}>SPY FILES</Text>
      </View>
      {stats.masterSpy && (
        <Highlight
          icon="🕵🏾"
          title="Smoothest Spy"
          body={`${stats.masterSpy.player.name} got away with it ${stats.masterSpy.wins} ${stats.masterSpy.wins === 1 ? 'time' : 'times'}.`}
        />
      )}
      {stats.usualSuspect && (
        <Highlight
          icon="🎲"
          title="Usual Suspect"
          body={`${stats.usualSuspect.player.name} was the spy ${stats.usualSuspect.times} times. The phone has favourites.`}
        />
      )}
      {state.history.map((r) => {
        const spy = getPlayer(state, r.spyId)!;
        return (
          <View key={r.round} style={styles.roundRow}>
            <Text style={styles.roundNo}>R{r.round}</Text>
            <Text style={styles.roundWord} numberOfLines={1}>
              {r.word}
            </Text>
            <Text style={styles.roundSpy} numberOfLines={1}>
              {spy.emoji} {spy.name}
            </Text>
            <Pill
              label={spyWon(r.outcome) ? 'Spy won' : 'Caught'}
              bg={spyWon(r.outcome) ? colors.onPink : '#3A2F55'}
              fg={spyWon(r.outcome) ? colors.pink : colors.primary}
            />
          </View>
        );
      })}

      <Button label="PLAY AGAIN" icon="rotate-cw" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 28 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button label="Share" icon="share-2" variant="secondary" onPress={share} style={{ flex: 1 }} />
        <Button label="Other games" icon="grid" variant="secondary" onPress={onChooseGame} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Highlight({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.highlight}>
      <View style={styles.highlightIcon}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.highlightTitle}>{title}</Text>
        <Text style={[type.body, { fontSize: 14 }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  halo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coral,
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  victory: { fontFamily: fonts.display, color: colors.text, fontSize: 30, textAlign: 'center', marginTop: 12, letterSpacing: -0.6 },
  statsRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14 },
  statValue: { fontFamily: fonts.display, fontSize: 26 },
  statLabel: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  rowFirst: { borderColor: colors.primaryStrong, backgroundColor: '#2A2236' },
  place: { width: 18, fontFamily: fonts.display, color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 13 },
  highlightsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 10 },
  highlightsTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 18, letterSpacing: 0.4 },
  highlight: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  highlightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 16 },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
  },
  roundNo: { fontFamily: fonts.bold, color: colors.textDim, fontSize: 12, width: 24 },
  roundWord: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  roundSpy: { flex: 1, fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
});
