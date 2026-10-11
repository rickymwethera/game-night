import { router, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Screen, type } from '../../components/ui';
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
      <AppHeader variant="session" title={game?.title ?? 'Game Night'} onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        {game?.image ? (
          <Image source={game.image} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.fallback]}>
            <Text style={{ fontSize: 72 }}>{game?.emoji ?? '🎲'}</Text>
          </View>
        )}
        <Text style={styles.title}>{game?.title ?? 'Unknown game'}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 8 }]}>Coming soon.</Text>
        <Button label="Back to games" variant="secondary" onPress={back} style={{ marginTop: 28 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  art: { width: 120, height: 120, borderRadius: radius.md, alignSelf: 'center', marginTop: 32 },
  fallback: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22, textAlign: 'center', marginTop: 20 },
});
