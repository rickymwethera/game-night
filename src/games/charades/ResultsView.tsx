import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Pill, type, type IconName } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { matchStats, standings, type CharadesAction, type CharadesState } from './engine';

const PLACE = ['1ST PLACE • CHAMPIONS', '2ND PLACE • VALIANT EFFORT', '3RD PLACE • GOOD VIBES', '4TH PLACE • NEXT TIME'];
const CONFETTI = [
  { top: 20, left: 40, size: 10, color: colors.pink, round: false },
  { top: 70, left: 20, size: 6, color: colors.surfaceHighest, round: true },
  { top: 30, right: 60, size: 12, color: colors.primary, round: true },
  { top: 110, right: 28, size: 8, color: colors.coral, round: false },
  { top: 130, left: 70, size: 7, color: colors.primary, round: false },
  { top: 12, right: 120, size: 6, color: colors.coral, round: true },
];

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
  const [showWords, setShowWords] = useState(false);

  const share = () => {
    const lines = ranked.map(({ team, score }, i) => `${i + 1}. ${team.emoji} ${team.name}: ${score} pts`);
    Share.share({
      message: `🎭 Game Night Charades\n${tie ? "It's a tie!" : `${winner.name} wins!`}\n\n${lines.join('\n')}\n\n${stats.correct} words guessed in ${state.round} rounds.`,
    }).catch(() => {});
  };

  const highlights: { icon: IconName; bg: string; title: string; tag?: string; body: string }[] = [];
  if (stats.quickest)
    highlights.push({
      icon: 'zap',
      bg: colors.orange,
      title: 'Quickest Guess',
      tag: `${(stats.quickest.ms / 1000).toFixed(1)}s Record`,
      body: `${stats.quickest.actor} acted out "${stats.quickest.word}" and the team got it almost instantly.`,
    });
  if (stats.toughest)
    highlights.push({
      icon: 'frown',
      bg: colors.pinkStrong,
      title: 'Toughest Card',
      tag: 'Iconic Struggle',
      body: `${stats.toughest.actor} wrestled with "${stats.toughest.word}" before giving up.`,
    });
  const busiest = [...state.history].sort(
    (a, b) => b.results.filter((r) => r.correct).length - a.results.filter((r) => r.correct).length,
  )[0];
  if (busiest && busiest.results.some((r) => r.correct))
    highlights.push({
      icon: 'trending-up',
      bg: colors.surfaceHighest,
      title: 'Hottest Turn',
      tag: `Round ${busiest.round}`,
      body: `${busiest.actor} landed ${busiest.results.filter((r) => r.correct).length} words in a single turn.`,
    });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.celebration}>
        {CONFETTI.map((c, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: c.top,
              left: c.left,
              right: c.right,
              width: c.size,
              height: c.size,
              borderRadius: c.round ? c.size / 2 : 2,
              backgroundColor: c.color,
              transform: [{ rotate: `${i * 25}deg` }],
            }}
          />
        ))}
        <View style={styles.trophyHalo}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
        </View>
        <Pill label={tie ? 'DEAD HEAT' : 'MATCH CHAMPION CROWNED'} icon="award" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center', marginTop: 18 }} />
        <Text style={styles.victory}>{tie ? "IT'S A TIE! 🤝" : `VICTORY FOR ${winner.name.toUpperCase()}! 🏆`}</Text>
        <View style={styles.matchMeta}>
          <View style={styles.metaItem}>
            <Icon name="rotate-ccw" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {state.round} {state.round === 1 ? 'Round' : 'Rounds'}{'\n'}Completed
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Icon name="flag" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.primary }]}>
              {stats.correct} Words{'\n'}Guessed
            </Text>
          </View>
        </View>
      </View>

      {ranked.map(({ team, score }, i) => {
        const first = i === 0 && !tie;
        const mvp = stats.mvp[team.id];
        return (
          <View key={team.id} style={[styles.teamTile, first && styles.teamTileFirst]}>
            {first && <View style={styles.edgeGlow} />}
            <View style={styles.teamRow}>
              <View style={[styles.teamAvatar, { backgroundColor: first ? team.color : colors.surfaceHighest }]}>
                <Text style={{ fontSize: 24 }}>{team.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.name.toUpperCase()}
                </Text>
                <Text style={[styles.place, { color: first ? colors.coral : colors.textMuted }]}>{PLACE[i] ?? ''}</Text>
              </View>
              <View style={[styles.scoreBadge, first ? { backgroundColor: colors.primaryStrong } : { backgroundColor: colors.surfaceHigh }]}>
                <Text style={[styles.scoreText, { color: first ? '#1A0050' : colors.text }]}>
                  {score} {Math.abs(score) === 1 ? 'PT' : 'PTS'}
                </Text>
              </View>
            </View>
            <View style={styles.accolade}>
              <Icon name={first ? 'award' : 'smile'} size={16} color={colors.coral} />
              <Text style={styles.accoladeLabel}>{first ? 'Team MVP:' : 'Top Actor:'}</Text>
              <Text style={styles.accoladeText} numberOfLines={2}>
                {mvp ? (
                  <>
                    <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>{mvp.actor}</Text> ({mvp.correct}{' '}
                    {mvp.correct === 1 ? 'word' : 'words'} guessed)
                  </>
                ) : (
                  'No words this game'
                )}
              </Text>
            </View>
          </View>
        );
      })}

      {highlights.length > 0 && (
        <>
          <View style={styles.highlightsHead}>
            <Icon name="star" size={18} color={colors.pink} />
            <Text style={styles.highlightsTitle}>PARTY HIGHLIGHTS</Text>
            <Text style={[type.label, { marginLeft: 'auto' }]}>Tonight's lore</Text>
          </View>
          {highlights.map((h) => (
            <View key={h.title} style={styles.highlight}>
              <View style={[styles.highlightIcon, { backgroundColor: h.bg }]}>
                <Icon name={h.icon} size={18} color="#FFF4EE" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.highlightTitle}>{h.title}</Text>
                  {h.tag && <Pill label={h.tag} bg={colors.surfaceHighest} fg={colors.textMuted} />}
                </View>
                <Text style={styles.highlightBody}>{h.body}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={styles.deckPerf}>
        <View style={styles.deckPerfHead}>
          <Icon name="layers" size={18} color={colors.textMuted} />
          <Text style={styles.deckPerfTitle}>Deck Performance</Text>
          <Pressable onPress={() => setShowWords(!showWords)} style={styles.reviewBtn} accessibilityRole="button">
            <Text style={styles.reviewText}>Review Words</Text>
            <Icon name={showWords ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
            <View>
              <Text style={styles.statValue}>{stats.correct}</Text>
              <Text style={styles.statLabel}>Guessed Correctly</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statDot, { backgroundColor: colors.orange }]} />
            <View>
              <Text style={styles.statValue}>{stats.skipped}</Text>
              <Text style={styles.statLabel}>Passes / Skipped</Text>
            </View>
          </View>
        </View>
        {showWords && (
          <View style={styles.wordList}>
            {stats.words.map((w, i) => (
              <Pill
                key={`${w.card.word}-${i}`}
                label={w.card.word}
                icon={w.correct ? 'check' : 'x'}
                bg={w.correct ? '#3A2F55' : colors.surfaceHigh}
                fg={w.correct ? colors.primary : colors.textDim}
              />
            ))}
          </View>
        )}
      </View>

      <Button label="PLAY REMATCH (SAME TEAMS)" icon="rotate-ccw" size="lg" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} style={{ marginTop: 24 }} />
      <Button label="Choose Another Game" icon="grid" variant="secondary" onPress={onChooseGame} style={{ marginTop: 12 }} />
      <Pressable onPress={share} style={styles.share} accessibilityRole="button">
        <Icon name="share-2" size={15} color={colors.coral} />
        <Text style={styles.shareText}>SHARE SCORECARD TO WHATSAPP & INSTAGRAM</Text>
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
  matchMeta: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  metaDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textDim },
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
  accoladeLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  accoladeText: { flex: 1, fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  highlightsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14 },
  highlightsTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  highlight: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  highlightIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { fontFamily: fonts.bold, color: colors.coral, fontSize: 15 },
  highlightBody: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 4 },
  deckPerf: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 4 },
  deckPerfHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckPerfTitle: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 19 },
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
  statsBar: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceLow, borderRadius: 14, padding: 14 },
  statDot: { width: 10, height: 10, borderRadius: 5, marginTop: 9 },
  statValue: { fontFamily: fonts.display, color: colors.text, fontSize: 22 },
  statLabel: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  wordList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  shareText: { fontFamily: fonts.bold, color: colors.coral, fontSize: 12, letterSpacing: 0.6 },
});
