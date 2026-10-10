import { router, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Pill, Screen, type } from '../../components/ui';
import type { GameId } from '../../core/types';
import { GAMES } from '../../games/registry';
import { colors, fonts, radius } from '../../theme';

/** Placeholder for games that aren't built yet. Built games have their own route file. */
export default function ComingSoonScreen() {
  const { id } = useLocalSearchParams<{ id: GameId }>();
  const game = GAMES.find((g) => g.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <AppHeader variant="session" title={game?.title.toUpperCase() ?? 'GAME NIGHT'} onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        {game?.image ? (
          <Image source={game.image} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.fallback]}>
            <Text style={{ fontSize: 72 }}>{game?.emoji ?? '🎲'}</Text>
          </View>
        )}
        <Pill label="COMING SOON" icon="clock" bg={colors.orange} fg="#FFE4D8" style={{ alignSelf: 'center', marginTop: 24 }} />
        <Text style={styles.title}>{game?.title ?? 'Unknown game'}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 8 }]}>{game?.description}</Text>
        {game && (
          <View style={styles.rules}>
            <Text style={[type.label, { marginBottom: 8 }]}>How it will work</Text>
            {game.rules.map((r, i) => (
              <Text key={r} style={[type.body, { fontSize: 14 }]}>
                <Text style={{ fontFamily: fonts.bold, color: colors.primary }}>{i + 1}. </Text>
                {r}
              </Text>
            ))}
          </View>
        )}
        <Button label="Play Charades instead" iconRight="arrow-right" size="lg" onPress={() => router.replace('/games/charades')} style={{ marginTop: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  art: { width: 160, height: 160, borderRadius: radius.lg, alignSelf: 'center', marginTop: 16 },
  fallback: { backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, color: colors.text, fontSize: 30, textAlign: 'center', marginTop: 12 },
  rules: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 6, marginTop: 24 },
});
