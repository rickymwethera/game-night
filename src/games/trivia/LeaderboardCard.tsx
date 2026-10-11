import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import type { LeaderboardEntry } from './engine';

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
        <Text style={styles.emptyBody}>No scores yet</Text>
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
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: e.color }]}>
              <Text style={{ fontSize: 16 }}>{e.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={styles.meta}>
                {e.correct}/{e.total} right · {formatDate(e.playedAt)}
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
  empty: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  emptyBody: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16 },
  rowFresh: { backgroundColor: colors.surfaceHigh },
  rank: { width: 20, textAlign: 'center', fontFamily: fonts.semibold, color: colors.textDim, fontSize: 14 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  meta: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, marginTop: 1 },
  score: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  footerText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12 },
});
