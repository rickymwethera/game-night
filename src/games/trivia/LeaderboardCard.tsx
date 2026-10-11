import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import type { LeaderboardEntry } from './engine';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Best Trivia scores on this phone. `highlight` marks entries from the game just played. */
export function LeaderboardCard({
  entries,
  highlight,
  collapsedCount = 5,
  onClear,
}: {
  entries: LeaderboardEntry[];
  highlight?: Set<string>;
  collapsedCount?: number;
  onClear?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Clearing takes two taps so a stray thumb can't wipe the board.
  const [confirmClear, setConfirmClear] = useState(false);

  if (entries.length === 0) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={{ fontSize: 32 }}>🏆</Text>
        <Text style={styles.emptyTitle}>No scores yet</Text>
        <Text style={styles.emptyBody}>Finish a game and the top scores on this phone land here.</Text>
      </View>
    );
  }

  const shown = expanded ? entries : entries.slice(0, collapsedCount);
  return (
    <View style={styles.card}>
      {shown.map((e, i) => {
        const fresh = highlight?.has(e.id);
        return (
          <View key={e.id} style={[styles.row, fresh && styles.rowFresh]}>
            <Text style={styles.rank}>{MEDALS[i] ?? `${i + 1}`}</Text>
            <View style={[styles.avatar, { backgroundColor: e.color }]}>
              <Text style={{ fontSize: 16 }}>{e.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {e.name}
                {fresh ? <Text style={{ color: colors.coral }}>  NEW</Text> : null}
              </Text>
              <Text style={styles.meta}>
                {e.correct}/{e.total} right • {formatDate(e.playedAt)}
              </Text>
            </View>
            <Text style={styles.score}>{e.score}</Text>
          </View>
        );
      })}
      <View style={styles.footer}>
        {entries.length > collapsedCount ? (
          <Pressable onPress={() => setExpanded(!expanded)} style={styles.footerBtn} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.footerText}>{expanded ? `Show top ${collapsedCount}` : `Show all ${entries.length}`}</Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
          </Pressable>
        ) : (
          <View />
        )}
        {onClear && (
          <Pressable
            onPress={() => {
              if (!confirmClear) return setConfirmClear(true);
              setConfirmClear(false);
              onClear();
            }}
            style={styles.footerBtn}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Text style={[styles.footerText, { color: confirmClear ? colors.danger : colors.textDim }]}>
              {confirmClear ? 'Tap again to clear' : 'Clear'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12 },
  empty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 19, marginTop: 8 },
  emptyBody: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16 },
  rowFresh: { backgroundColor: '#2A2236' },
  rank: { width: 26, textAlign: 'center', fontFamily: fonts.extrabold, color: colors.textMuted, fontSize: 15 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  meta: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, marginTop: 1 },
  score: { fontFamily: fonts.display, color: colors.primary, fontSize: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  footerText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 12 },
});
