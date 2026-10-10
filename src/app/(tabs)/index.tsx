import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, CircleButton, Icon, Pill, Screen, SectionHeader, type } from '../../components/ui';
import { appActions, useAppState } from '../../core/store';
import { GAMES, type GameInfo } from '../../games/registry';
import { CHARADES_CATEGORIES } from '../../games/charades/words';
import { colors, fonts, gradients, radius } from '../../theme';

const KENYAN_DECKS = CHARADES_CATEGORIES.filter((c) => c.collection === 'kenyan');

export default function HomeScreen() {
  const soundOn = useAppState((s) => s.soundOn);
  return (
    <Screen>
      <AppHeader
        variant="brand"
        section="HOME"
        right={
          <CircleButton
            icon={soundOn ? 'volume-2' : 'volume-x'}
            label={soundOn ? 'Turn buzz off' : 'Turn buzz on'}
            onPress={() => appActions.setSoundOn(!soundOn)}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero />
        <LastSession />
        <KenyanSpotlight />
        <SectionHeader
          title="Popular Party Games"
          subtitle="Pass the phone, shout answers, score points"
          right={
            <Pressable onPress={() => router.navigate('/games')} hitSlop={8}>
              <Text style={styles.link}>View All ({GAMES.length})</Text>
            </Pressable>
          }
        />
        {GAMES.map((g) => (
          <GameRow key={g.id} game={g} />
        ))}
        <HowToPlay />
      </ScrollView>
    </Screen>
  );
}

function Hero() {
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}>
        <Pill label="100% Offline Ready • No Login Needed" icon="zap" bg="#2A2D3A" fg={colors.coral} />
        <View style={styles.popper}>
          <Text style={{ fontSize: 16 }}>🎉</Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>Host a Game Night Tonight! 🎲</Text>
      <Text style={styles.heroSub}>1 Phone • 1 Group • Endless Laughs</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/games/charades')}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <LinearGradient colors={gradients.quickPlay} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.quickPlay}>
          <View style={styles.playCircle}>
            <Icon name="play" size={18} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickTitle}>QUICK PLAY</Text>
            <Text style={styles.quickSub}>Charades • All decks • Ready in 30s</Text>
          </View>
          <Icon name="arrow-right" size={22} color={colors.onPrimary} />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

function LastSession() {
  const last = useAppState((s) => s.history[0]);
  const champ = last && [...last.teams].sort((a, b) => b.score - a.score)[0];
  return (
    <View style={styles.strip}>
      <View style={styles.trophy}>
        <Icon name="award" size={18} color={colors.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.label}>Last session</Text>
        <Text style={styles.stripMain} numberOfLines={1}>
          {last ? `${last.rounds} ${last.rounds === 1 ? 'Round' : 'Rounds'} of Charades` : 'No games yet'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.champLabel}>Champion</Text>
        <Text style={styles.stripMain} numberOfLines={1}>
          {champ ? `${champ.name} (${champ.score} pts)` : 'Could be you'}
        </Text>
      </View>
    </View>
  );
}

function KenyanSpotlight() {
  const kenyanCards = KENYAN_DECKS.reduce((n, d) => n + d.words.length, 0);
  const featured = KENYAN_DECKS.filter((d) => d.id === 'sheng' || d.id === 'kenyan-celebs');
  const play = () => router.push({ pathname: '/games/charades', params: { decks: KENYAN_DECKS.map((d) => d.id).join(',') } });
  return (
    <View style={styles.spotlight}>
      <View>
        <Image source={require('../../../assets/images/spotlight.jpg')} style={styles.spotImage} resizeMode="cover" />
        <LinearGradient colors={['transparent', colors.surface]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.4 }} end={{ x: 0, y: 1 }} />
        <View style={styles.spotBadges}>
          <Pill label="NEW • SHENG & CULTURE" bg={colors.pinkStrong} fg="#3D0020" />
          <Pill label="Trending" icon="trending-up" bg="rgba(17,20,29,0.85)" fg={colors.coral} />
        </View>
      </View>
      <View style={{ padding: 20, paddingTop: 4 }}>
        <Text style={styles.spotTitle}>🔥 Kenyan Edition Spotlight</Text>
        <Text style={[type.body, { marginTop: 8 }]}>
          Pure 254 banter, local inside jokes, and high-energy showdowns for your crew. {kenyanCards} cards.
        </Text>
        <View style={styles.subDecks}>
          {featured.map((d) => (
            <View key={d.id} style={styles.subDeck}>
              <View style={styles.subDeckTop}>
                <Text style={{ fontSize: 16 }}>{d.emoji}</Text>
                <Text style={styles.cardCount}>{d.words.length} Cards</Text>
              </View>
              <Text style={styles.subDeckTitle} numberOfLines={1}>
                {d.title}
              </Text>
              <Text style={styles.subDeckSub}>Charades & Acting</Text>
            </View>
          ))}
        </View>
        <View style={styles.tags}>
          {['#ShengSlang', '#GengetoneVibes', '#NyamaChoma'].map((t) => (
            <Pill key={t} label={t} bg={colors.surfaceHigh} fg={colors.textMuted} />
          ))}
        </View>
        <Button label="Play Kenyan Spotlight" variant="pink" iconRight="play-circle" onPress={play} style={{ marginTop: 18 }} />
      </View>
    </View>
  );
}

function GameRow({ game }: { game: GameInfo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.title}${game.available ? '' : ', coming soon'}`}
      onPress={() => router.push(`/games/${game.id}`)}
      style={({ pressed }) => [styles.gameRow, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {game.image ? (
        <Image source={game.image} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={{ fontSize: 34 }}>{game.emoji}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {game.title}
          </Text>
          <Pill
            label={game.available ? game.players : 'Soon'}
            bg={game.available ? '#3A2F55' : colors.surfaceHighest}
            fg={game.available ? colors.primary : colors.textDim}
          />
        </View>
        <Text style={styles.rowTagline} numberOfLines={1}>
          {game.tagline}
        </Text>
        <View style={styles.rowMeta}>
          {game.pills.slice(0, 2).map((p) => (
            <View key={p.label} style={styles.metaItem}>
              <Icon name={p.icon} size={12} color={colors.coral} />
              <Text style={styles.metaText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function HowToPlay() {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.howTo} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={styles.howHeader}>
        <View style={styles.helpCircle}>
          <Icon name="help-circle" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.howTitle}>First Time Hosting?</Text>
          <Text style={styles.howSub}>How to play in 3 effortless steps</Text>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </View>
      {open && (
        <View style={{ marginTop: 14, gap: 10 }}>
          {[
            'Pick a game and set up teams. Add names so the app can call out each actor.',
            'Pass the phone to whoever is up. Everyone else stays honest and looks away.',
            'Play fast, tap to score, and crown your champions at the end.',
          ].map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={[type.body, { flex: 1 }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  link: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  hero: { borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.surfaceHigh },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,176,205,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 31, lineHeight: 36, marginTop: 18, letterSpacing: -0.6 },
  heroSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 16, marginTop: 6 },
  quickPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 22,
    shadowColor: '#AF3917',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { fontFamily: fonts.display, color: colors.onPrimary, fontSize: 19, letterSpacing: 1 },
  quickSub: { fontFamily: fonts.semibold, color: '#2A0066', fontSize: 12, marginTop: 1 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 16,
  },
  trophy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A2D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripMain: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, marginTop: 2, maxWidth: 170 },
  champLabel: { fontFamily: fonts.semibold, color: colors.coral, fontSize: 11 },
  spotlight: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginTop: 16 },
  spotImage: { width: '100%', height: 190 },
  spotBadges: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 },
  spotTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  subDecks: { flexDirection: 'row', gap: 10, marginTop: 16 },
  subDeck: { flex: 1, backgroundColor: colors.surfaceLow, borderRadius: 18, padding: 14 },
  subDeckTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCount: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 11 },
  subDeckTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, marginTop: 10 },
  subDeckSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  thumb: { width: 76, height: 76, borderRadius: 18 },
  thumbFallback: { backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontFamily: fonts.displayBold, color: colors.text, fontSize: 17 },
  rowTagline: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginTop: 3 },
  rowMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11 },
  howTo: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 4 },
  howHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helpCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  howSub: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    overflow: 'hidden',
  },
});
