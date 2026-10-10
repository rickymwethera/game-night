import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Chip, CircleButton, Icon, Pill, Screen, type } from '../../components/ui';
import { GAME_TAGS, GAMES, type GameInfo, type GameTag } from '../../games/registry';
import { colors, fonts, radius } from '../../theme';

export default function GamesScreen() {
  const [filter, setFilter] = useState<GameTag | 'all'>('all');
  const games = filter === 'all' ? GAMES : GAMES.filter((g) => g.tags.includes(filter));

  return (
    <Screen>
      <AppHeader variant="brand" section="GAMES" />
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={`All (${GAMES.length})`} icon="grid" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {GAME_TAGS.map((t) => (
            <Chip key={t.id} label={t.label} icon={t.icon} selected={filter === t.id} onPress={() => setFilter(t.id)} />
          ))}
        </ScrollView>
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        <View style={styles.callout}>
          <View style={styles.calloutIcon}>
            <Icon name="book-open" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>Custom Rules or House Bet?</Text>
            <Text style={[type.body, { fontSize: 13, lineHeight: 19 }]}>
              Tap the ? on any game for a 30-second crash course, or adjust timers and points in game setup.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function GameCard({ game }: { game: GameInfo }) {
  const [showRules, setShowRules] = useState(false);
  const open = () => router.push(`/games/${game.id}`);
  return (
    <View style={styles.card}>
      <View>
        {game.image ? (
          <Image source={game.image} style={styles.banner} resizeMode="cover" />
        ) : (
          <View style={[styles.banner, styles.bannerFallback]}>
            <Text style={{ fontSize: 64 }}>{game.emoji}</Text>
          </View>
        )}
        <LinearGradient
          colors={['rgba(28,31,41,0.1)', 'rgba(28,31,41,0.25)', colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badges}>
          <Pill label={game.badge.label} icon={game.badge.icon} bg={game.badge.bg} fg={game.badge.fg} />
          {!game.available && <Pill label="Coming soon" bg="rgba(17,20,29,0.85)" fg={colors.coral} />}
        </View>
        <View style={styles.cornerIcon}>
          <CircleButton icon={game.icon} label={game.title} variant={game.available ? 'primary' : 'dark'} size={48} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{game.title}</Text>
        <Text style={[type.body, { marginTop: 8 }]}>{game.description}</Text>
        <View style={styles.pills}>
          {[{ label: game.players, icon: 'users' as const }, ...game.pills].map((p) => (
            <Pill key={p.label} label={p.label} icon={p.icon} bg={colors.surfaceLow} fg={colors.coral} />
          ))}
        </View>
        {showRules && (
          <View style={styles.rules}>
            {game.rules.map((r, i) => (
              <Text key={r} style={[type.body, { fontSize: 14 }]}>
                <Text style={{ fontFamily: fonts.bold, color: colors.primary }}>{i + 1}. </Text>
                {r}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.actions}>
          <Button
            label={game.available ? 'Play Game' : 'Coming Soon'}
            iconRight={game.available ? 'arrow-right' : undefined}
            variant={game.available ? 'primary' : 'secondary'}
            onPress={open}
            style={{ flex: 1 }}
          />
          <CircleButton
            icon={showRules ? 'x' : 'help-circle'}
            label="Quick rules"
            onPress={() => setShowRules(!showRules)}
            size={52}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  chips: { gap: 8, paddingBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 18 },
  banner: { width: '100%', height: 180 },
  bannerFallback: { backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 },
  cornerIcon: { position: 'absolute', right: 14, bottom: 6 },
  body: { padding: 22, paddingTop: 10 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.text, letterSpacing: -0.6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  rules: { backgroundColor: colors.surfaceLow, borderRadius: 16, padding: 14, gap: 6, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  callout: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  calloutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18, marginBottom: 4 },
});
