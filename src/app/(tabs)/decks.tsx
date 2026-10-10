import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader, Chip, Icon, Pill, Screen, SectionHeader, Toggle, type } from '../../components/ui';
import { shuffle } from '../../core/types';
import { appActions, useAppState } from '../../core/store';
import { DECK_IMAGES } from '../../games/charades/deckImages';
import { CHARADES_CATEGORIES, type CharadesCategory } from '../../games/charades/words';
import { colors, fonts, radius } from '../../theme';

type Filter = 'all' | 'kenyan' | 'global';
const TOTAL_CARDS = CHARADES_CATEGORIES.reduce((n, c) => n + c.words.length, 0);
const ICON_COLORS = [colors.primaryStrong, colors.orange, colors.pinkStrong];

function playDeck(id: string) {
  router.push({ pathname: '/games/charades', params: { decks: id } });
}

export default function DecksScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const adult = useAppState((s) => s.adultContent);

  const matches = (c: CharadesCategory) => {
    if (filter !== 'all' && c.collection !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.words.some((w) => w.toLowerCase().includes(q))
    );
  };
  const kenyan = CHARADES_CATEGORIES.filter((c) => c.collection === 'kenyan' && matches(c));
  const global = CHARADES_CATEGORIES.filter((c) => c.collection === 'global' && matches(c));

  return (
    <Screen>
      <AppHeader variant="brand" section="DECKS" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${TOTAL_CARDS} cards, slang, songs...`}
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All Decks" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="🇰🇪 Kenyan Special" selected={filter === 'kenyan'} onPress={() => setFilter('kenyan')} />
          <Chip label="Global Hits" selected={filter === 'global'} onPress={() => setFilter('global')} />
        </ScrollView>

        <View style={styles.adult}>
          <View style={styles.adultIcon}>
            <Icon name="eye-off" size={18} color={colors.onPink} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.adultTitle}>Party After Dark (18+)</Text>
              {!adult && <Pill label="LOCKED" bg="#5C1A10" fg={colors.coral} />}
            </View>
            <Text style={[type.body, { fontSize: 13, lineHeight: 18 }]}>Unfiltered slang, spicy dares and wild confessions</Text>
          </View>
          <Toggle value={adult} onChange={appActions.setAdultContent} color={colors.pinkStrong} label="Adults-only content" />
        </View>

        {kenyan.length > 0 && (
          <>
            <SectionHeader
              title="🇰🇪 The Kenyan Vault"
              right={<Pill label="Signature" bg={colors.primaryStrong} fg="#1A0050" />}
            />
            {kenyan.map((c) => (
              <PhotoDeck key={c.id} deck={c} />
            ))}
          </>
        )}
        {global.length > 0 && (
          <>
            <SectionHeader title="Global Hits" right={<Text style={type.label}>{global.length} decks</Text>} />
            {global.map((c, i) => (
              <IconDeck key={c.id} deck={c} color={ICON_COLORS[i % ICON_COLORS.length]} />
            ))}
          </>
        )}
        {filter !== 'kenyan' && !query && <SpicyDeck unlocked={adult} />}
        {kenyan.length + global.length === 0 && (
          <Text style={[type.body, { textAlign: 'center', marginTop: 32 }]}>No decks match “{query}”.</Text>
        )}

        <View style={styles.offline}>
          <Icon name="check-circle" size={16} color={colors.primary} />
          <Text style={styles.offlineText}>All {TOTAL_CARDS} cards are saved on this phone for offline parties</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function usePreview(deck: CharadesCategory) {
  const [open, setOpen] = useState(false);
  const sample = useMemo(() => shuffle(deck.words).slice(0, 3), [deck, open]);
  return { open, toggle: () => setOpen(!open), sample };
}

function PreviewRow({ deck, footerIcon }: { deck: CharadesCategory; footerIcon: 'check-circle' | 'tag' }) {
  const { open, toggle, sample } = usePreview(deck);
  return (
    <>
      {open && (
        <View style={styles.sample}>
          {sample.map((w) => (
            <Pill key={w} label={w} bg={colors.surfaceHighest} fg={colors.text} />
          ))}
        </View>
      )}
      <View style={styles.deckFooter}>
        <View style={styles.footerTag}>
          <Icon name={footerIcon} size={13} color={colors.coral} />
          <Text style={styles.footerText}>{deck.tag}</Text>
        </View>
        <Pressable onPress={toggle} style={styles.previewBtn} accessibilityRole="button">
          <Icon name={open ? 'eye-off' : 'eye'} size={14} color={colors.text} />
          <Text style={styles.previewText}>{open ? 'Hide' : 'Preview 3'}</Text>
        </Pressable>
      </View>
    </>
  );
}

function PhotoDeck({ deck }: { deck: CharadesCategory }) {
  return (
    <View style={styles.deck}>
      <Pressable onPress={() => playDeck(deck.id)} accessibilityRole="button" accessibilityLabel={`Play ${deck.title}`}>
        <View>
          <Image source={DECK_IMAGES[deck.id]} style={styles.deckImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', colors.surface]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.3 }} end={{ x: 0, y: 1 }} />
          <View style={styles.imageBadges}>
            {deck.badge ? <Pill label={deck.badge} bg={colors.orange} fg="#FFE4D8" /> : <View />}
            <Pill label={`${deck.words.length} Cards`} icon="layers" bg="rgba(17,20,29,0.85)" fg={colors.text} />
          </View>
        </View>
        <View style={styles.deckBody}>
          <View style={styles.deckTitleRow}>
            <Text style={styles.deckTitle}>{deck.title}</Text>
            <View style={styles.difficulty}>
              <Icon name="activity" size={12} color={colors.primary} />
              <Text style={styles.difficultyText}>{deck.difficulty}</Text>
            </View>
          </View>
          <Text style={[type.body, { fontSize: 14, marginTop: 4 }]}>{deck.description}</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <PreviewRow deck={deck} footerIcon="check-circle" />
      </View>
    </View>
  );
}

function IconDeck({ deck, color }: { deck: CharadesCategory; color: string }) {
  return (
    <View style={[styles.deck, { padding: 20 }]}>
      <Pressable onPress={() => playDeck(deck.id)} accessibilityRole="button" accessibilityLabel={`Play ${deck.title}`}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={[styles.deckIcon, { backgroundColor: color }]}>
            <Text style={{ fontSize: 26 }}>{deck.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deckTitle}>{deck.title}</Text>
            <Text style={styles.deckMeta}>
              {deck.words.length} Cards • {deck.difficulty}
            </Text>
          </View>
        </View>
        <Text style={[type.body, { fontSize: 14, marginTop: 12 }]}>{deck.description}</Text>
      </Pressable>
      <PreviewRow deck={deck} footerIcon="tag" />
    </View>
  );
}

function SpicyDeck({ unlocked }: { unlocked: boolean }) {
  return (
    <View style={[styles.deck, { padding: 20, opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={[styles.deckIcon, { backgroundColor: '#7A1F4F' }]}>
          <Text style={{ fontSize: 26 }}>🌶️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deckTitle}>Spicy Secrets (18+)</Text>
          <Text style={styles.deckMeta}>Wild party truths</Text>
        </View>
        <Pill label={unlocked ? 'Coming soon' : '18+ Locked'} icon="lock" bg="#5C1A10" fg={colors.coral} />
      </View>
      <Text style={[type.body, { fontSize: 14, marginTop: 12 }]}>
        Cringe confessions, ex encounters and awkward situations. Arriving with Dare or Challenge.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    height: 54,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15, height: '100%' },
  chips: { gap: 8, paddingVertical: 16 },
  adult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
  },
  adultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pinkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adultTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 17 },
  deck: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 16 },
  deckImage: { width: '100%', height: 150 },
  imageBadges: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' },
  deckBody: { paddingHorizontal: 20, paddingTop: 4 },
  deckTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deckTitle: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 21, letterSpacing: -0.3 },
  difficulty: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  difficultyText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 11, letterSpacing: 0.5 },
  deckIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  deckMeta: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12, marginTop: 2 },
  sample: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  deckFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  footerTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: fonts.semibold, color: colors.coral, fontSize: 12 },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  previewText: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 8,
  },
  offlineText: { flex: 1, fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
});
