import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Chip, CircleButton, Screen, SectionHeader, type } from '../../components/ui';
import { GAME_TAGS, GAMES, type GameInfo, type GameTag } from '../../games/registry';
import { colors, fonts, radius } from '../../theme';

export default function GamesScreen() {
  const [filter, setFilter] = useState<GameTag | 'all'>('all');
  const shown = filter === 'all' ? GAMES : GAMES.filter((g) => g.tags.includes(filter));
  const playable = shown.filter((g) => g.available);
  const soon = shown.filter((g) => !g.available);

  return (
    <Screen>
      <AppHeader variant="brand" />
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {GAME_TAGS.map((t) => (
            <Chip key={t.id} label={t.label} selected={filter === t.id} onPress={() => setFilter(t.id)} />
          ))}
        </ScrollView>
        {playable.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {soon.length > 0 && (
          <>
            <SectionHeader title="Coming soon" />
            {soon.map((g) => (
              <Text key={g.id} style={styles.soon}>
                {g.emoji}  {g.title}
              </Text>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function GameCard({ game }: { game: GameInfo }) {
  const [showRules, setShowRules] = useState(false);
  return (
    <View style={styles.card}>
      {game.image ? (
        <Image source={game.image} style={styles.banner} resizeMode="cover" />
      ) : (
        <View style={[styles.banner, styles.bannerFallback]}>
          <Text style={{ fontSize: 44 }}>{game.emoji}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{game.title}</Text>
        <Text style={[type.body, { marginTop: 4 }]}>{game.tagline}</Text>
        {showRules && (
          <View style={styles.rules}>
            <Text style={type.label}>{game.players}</Text>
            {game.rules.map((r, i) => (
              <Text key={r} style={[type.body, { fontSize: 14 }]}>
                {i + 1}. {r}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.actions}>
          <Button label="Play" onPress={() => router.push(`/games/${game.id}`)} style={{ flex: 1 }} />
          <CircleButton
            icon={showRules ? 'x' : 'help-circle'}
            label={showRules ? 'Hide rules' : 'Show rules'}
            onPress={() => setShowRules(!showRules)}
            size={48}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  chips: { gap: 8, paddingBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', marginBottom: 14 },
  banner: { width: '100%', height: 120 },
  bannerFallback: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.text },
  rules: { backgroundColor: colors.surfaceLow, borderRadius: radius.sm, padding: 14, gap: 6, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  soon: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 15, paddingVertical: 6 },
});
