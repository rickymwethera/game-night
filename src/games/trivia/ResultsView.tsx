import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Pill, SectionHeader, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { getQuestion, matchStats, standings, type TriviaAction, type TriviaState } from './engine';
import { LeaderboardCard } from './LeaderboardCard';
import { useLeaderboard } from './leaderboard';

const PLACE = ['1ST PLACE • BRAINIACS', '2ND PLACE • SO CLOSE', '3RD PLACE • GOOD EFFORT', '4TH PLACE • HIT THE BOOKS'];

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
  const [showMissed, setShowMissed] = useState(true);

  const topSpot = leaderboard.findIndex((e) => newEntryIds.has(e.id));
  const headline = solo ? `${ranked[0].score} POINTS!` : tie ? "IT'S A TIE! 🤝" : `${winner.name.toUpperCase()} WINS! 🏆`;

  const share = () => {
    const lines = ranked.map(
      ({ team, score }, i) => `${i + 1}. ${team.emoji} ${team.name}: ${score} pts (${stats.perTeam[team.id].correct}/${stats.perTeam[team.id].total})`,
    );
    Share.share({
      message: `🧠 Game Night: Trivia\n${solo ? '' : tie ? "It's a tie!\n" : `${winner.name} wins!\n`}\n${lines.join('\n')}`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.celebration}>
        <View style={styles.trophyHalo}>
          <Text style={{ fontSize: 40 }}>{solo ? '🧠' : '🏆'}</Text>
        </View>
        <Pill label={`TRIVIA • ${stats.total} QUESTIONS`} icon="help-circle" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center', marginTop: 18 }} />
        <Text style={styles.victory}>{headline}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 6 }]}>
          {stats.total > 0 ? `${Math.round((stats.correct / stats.total) * 100)}% of questions answered correctly` : 'No questions played'}
        </Text>
        {topSpot >= 0 && topSpot < 3 && (
          <Pill
            label={topSpot === 0 ? 'NEW HIGH SCORE ON THIS PHONE' : `#${topSpot + 1} ON THE LEADERBOARD`}
            icon="trending-up"
            bg="#3A2F55"
            fg={colors.primary}
            style={{ alignSelf: 'center', marginTop: 12 }}
          />
        )}
      </View>

      {ranked.map(({ team, score }, i) => {
        const first = i === 0 && !tie && !solo;
        const t = stats.perTeam[team.id];
        return (
          <View key={team.id} style={[styles.teamTile, first && styles.teamTileFirst]}>
            {first && <View style={styles.edgeGlow} />}
            <View style={styles.teamRow}>
              <View style={[styles.teamAvatar, { backgroundColor: first || solo ? team.color : colors.surfaceHighest }]}>
                <Text style={{ fontSize: 24 }}>{team.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.name.toUpperCase()}
                </Text>
                {!solo && <Text style={[styles.place, { color: first ? colors.coral : colors.textMuted }]}>{PLACE[i] ?? ''}</Text>}
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: first ? colors.primaryStrong : colors.surfaceHigh }]}>
                <Text style={[styles.scoreText, { color: first ? '#1A0050' : colors.text }]}>{score} PTS</Text>
              </View>
            </View>
            <View style={styles.accolade}>
              <Icon name="zap" size={16} color={colors.coral} />
              <Text style={styles.accoladeText}>
                Best streak <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>{t.bestStreak}</Text> • {t.correct} of {t.total} right
              </Text>
            </View>
          </View>
        );
      })}

      {stats.quickest && (
        <View style={styles.highlight}>
          <Text style={{ fontSize: 32 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.highlightTitle}>Quickest Answer</Text>
              <Pill label={`${(stats.quickest.ms / 1000).toFixed(1)}s`} bg={colors.surfaceHighest} fg={colors.textMuted} />
            </View>
            <Text style={styles.highlightBody}>
              {state.settings.teams.find((t) => t.id === stats.quickest!.teamId)?.name} knew it was{' '}
              <Text style={{ color: colors.primary }}>{getQuestion(stats.quickest.id).a}</Text> in a flash.
            </Text>
          </View>
        </View>
      )}

      {stats.missed.length > 0 && (
        <View style={styles.missed}>
          <View style={styles.missedHead}>
            <Icon name="book-open" size={18} color={colors.textMuted} />
            <Text style={styles.missedTitle}>Answers to Remember ({stats.missed.length})</Text>
            <Pressable onPress={() => setShowMissed(!showMissed)} style={styles.reviewBtn} accessibilityRole="button">
              <Text style={styles.reviewText}>{showMissed ? 'Hide' : 'Show'}</Text>
              <Icon name={showMissed ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </Pressable>
          </View>
          {showMissed &&
            stats.missed.map((id) => {
              const q = getQuestion(id);
              return (
                <View key={id} style={styles.missedItem}>
                  <Text style={styles.missedQ}>{q.q}</Text>
                  <Text style={styles.missedA}>{q.a}</Text>
                </View>
              );
            })}
        </View>
      )}

      <SectionHeader title="Leaderboard" icon="bar-chart-2" subtitle="Best scores on this phone" />
      <LeaderboardCard entries={leaderboard} highlight={newEntryIds} />

      <Button label="PLAY AGAIN (NEW QUESTIONS)" icon="rotate-ccw" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 24 }} />
      <Button label="Change Packs or Teams" icon="sliders" variant="secondary" onPress={onChangeSettings} style={{ marginTop: 12 }} />
      <Button label="Choose Another Game" icon="grid" variant="secondary" onPress={onChooseGame} style={{ marginTop: 12 }} />
      <Pressable onPress={share} style={styles.share} accessibilityRole="button">
        <Icon name="share-2" size={15} color={colors.coral} />
        <Text style={styles.shareText}>SHARE SCORECARD</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  celebration: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  trophyHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coralStrong,
    shadowOpacity: 0.8,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  victory: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: -0.6,
  },
  teamTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  teamTileFirst: {
    borderColor: '#4A3B7A',
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  edgeGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: colors.pink },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontFamily: fonts.display, color: colors.text, fontSize: 21, letterSpacing: -0.2 },
  place: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  scoreBadge: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  scoreText: { fontFamily: fonts.display, fontSize: 20 },
  accolade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  accoladeText: { flex: 1, fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 8,
  },
  highlightTitle: { fontFamily: fonts.bold, color: colors.coral, fontSize: 15 },
  highlightBody: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 4 },
  missed: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 14 },
  missedHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  missedTitle: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 19 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D2A45',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 12 },
  missedItem: { backgroundColor: colors.surfaceLow, borderRadius: 14, padding: 12, marginTop: 8 },
  missedQ: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  missedA: { fontFamily: fonts.bold, color: colors.success, fontSize: 15, marginTop: 3 },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  shareText: { fontFamily: fonts.bold, color: colors.coral, fontSize: 12, letterSpacing: 0.6 },
});
