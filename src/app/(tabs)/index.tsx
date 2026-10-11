import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, CircleButton, Icon, Screen, SectionHeader } from '../../components/ui';
import { appActions, useAppState } from '../../core/store';
import { GAMES, getGame, type GameInfo } from '../../games/registry';
import { colors, fonts, radius } from '../../theme';

const PLAYABLE = GAMES.filter((g) => g.available);

export default function HomeScreen() {
  const soundOn = useAppState((s) => s.soundOn);
  return (
    <Screen>
      <AppHeader
        variant="brand"
        right={
          <CircleButton
            icon={soundOn ? 'volume-2' : 'volume-x'}
            label={soundOn ? 'Turn buzz off' : 'Turn buzz on'}
            onPress={() => appActions.setSoundOn(!soundOn)}
            size={40}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What are we playing?</Text>
        <Button
          label="Quick play: Charades"
          icon="play"
          size="lg"
          onPress={() => router.push('/games/charades')}
          style={{ marginTop: 20 }}
        />
        <LastSession />
        <SectionHeader title="Games" />
        {PLAYABLE.map((g) => (
          <GameRow key={g.id} game={g} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function LastSession() {
  const last = useAppState((s) => s.history[0]);
  if (!last) return null;
  const ranked = [...last.teams].sort((a, b) => b.score - a.score);
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  return (
    <Text style={styles.last} numberOfLines={1}>
      Last game: {getGame(last.gameId).title} · {tie ? 'a tie' : `${ranked[0].name} won`}
    </Text>
  );
}

function GameRow({ game }: { game: GameInfo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={game.title}
      onPress={() => router.push(`/games/${game.id}`)}
      style={({ pressed }) => [styles.gameRow, pressed && { opacity: 0.8 }]}
    >
      {game.image ? (
        <Image source={game.image} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={{ fontSize: 26 }}>{game.emoji}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={styles.rowTagline} numberOfLines={1}>
          {game.tagline}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  title: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 26, marginTop: 12 },
  last: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 14, textAlign: 'center' },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 52, height: 52, borderRadius: 14 },
  thumbFallback: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  rowTagline: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
