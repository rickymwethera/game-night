import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useReduceMotion } from '../../components/motion';
import { Button, type } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { getCategory, type CategoryId } from './cards';
import { newSeed, nextUp, standings, turnPlayer, type DareAction, type DareState } from './engine';

type Dispatch = (action: DareAction) => void;

function buzz(enabled: boolean, kind: 'success' | 'warning' | 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}

const SPIN_MS = 3200;
const SPIN_TURNS = 5;
/** A beat on the landed segment before the card appears. */
const SETTLE_MS = 600;
const WHEEL_INK = '#11141D';

/** A point on the wheel's rim, `angle` degrees clockwise from the top. */
function rim(c: number, r: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
}

function WheelFace({ categoryIds, size }: { categoryIds: CategoryId[]; size: number }) {
  const c = size / 2;
  const r = c - 2;
  const seg = 360 / categoryIds.length;
  return (
    <Svg width={size} height={size}>
      {categoryIds.map((id, i) => {
        const category = getCategory(id);
        const start = rim(c, r, i * seg);
        const end = rim(c, r, (i + 1) * seg);
        const mid = (i + 0.5) * seg;
        return (
          <G key={id}>
            {categoryIds.length === 1 ? (
              <Circle cx={c} cy={c} r={r} fill={category.color} />
            ) : (
              <Path
                d={`M ${c} ${c} L ${start.x} ${start.y} A ${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`}
                fill={category.color}
                stroke={colors.background}
                strokeWidth={3}
              />
            )}
            <G transform={`rotate(${mid} ${c} ${c})`}>
              <SvgText x={c} y={c - r * 0.68} fontSize={size * 0.09} textAnchor="middle" alignmentBaseline="middle">
                {category.emoji}
              </SvgText>
              <SvgText
                x={c}
                y={c - r * 0.44}
                fontSize={size * 0.048}
                fontFamily={fonts.bold}
                fontWeight="700"
                fill={WHEEL_INK}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {category.title}
              </SvgText>
            </G>
          </G>
        );
      })}
      <Circle cx={c} cy={c} r={size * 0.09} fill={colors.background} />
      <Circle cx={c} cy={c} r={size * 0.035} fill={colors.text} />
    </Svg>
  );
}

/**
 * The wheel, the pointer and the Spin button. Stays mounted through the spin so
 * the wheel animates from where it is; the engine has already picked where it
 * lands, this only shows it.
 */
export function SpinView({ state, dispatch, soundOn }: { state: DareState; dispatch: Dispatch; soundOn: boolean }) {
  const player = turnPlayer(state);
  const { categoryIds, players, rounds } = state.settings;
  const { width } = useWindowDimensions();
  const size = Math.min(width - 56, 320);
  const reduce = useReduceMotion();
  const angle = useRef(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const spinning = state.phase === 'spinning';

  useEffect(() => {
    if (state.phase !== 'spinning' || state.landed === null) return;
    const seg = 360 / categoryIds.length;
    // Stop somewhere inside the segment, not dead centre, so it looks like a real wheel.
    const stopAt = (state.landed + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6;
    const from = angle.current;
    const base = from + 360 * (reduce ? 1 : SPIN_TURNS);
    const to = base + ((((-stopAt - base) % 360) + 360) % 360);
    angle.current = to;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const anim = Animated.timing(rotation, {
      toValue: to,
      duration: reduce ? 400 : SPIN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(() => {
      buzz(soundOn, 'success');
      settle = setTimeout(() => dispatch({ type: 'REVEAL' }), SETTLE_MS);
    });
    return () => {
      anim.stop();
      if (settle) clearTimeout(settle);
    };
  }, [state.phase, state.landed, categoryIds.length, reduce, rotation, dispatch, soundOn]);

  const spin = () => {
    if (state.phase !== 'spin') return;
    buzz(soundOn, 'light');
    dispatch({ type: 'SPIN', seed: newSeed() });
  };

  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.turnRow}>
        <View style={[styles.avatar, { backgroundColor: player.color }]}>
          <Text style={{ fontSize: 20 }}>{player.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.turnName} numberOfLines={1}>
            {player.name}'s turn
          </Text>
          <Text style={styles.turnMeta}>
            Round {state.round} of {rounds} · turn {state.playerIndex + 1} of {players.length}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={spin}
        disabled={spinning}
        accessibilityRole="button"
        accessibilityLabel="Spin the wheel"
        style={[styles.wheelWrap, { width: size, height: size + 14 }]}
      >
        <Animated.View style={{ marginTop: 14, transform: [{ rotate }] }}>
          <WheelFace categoryIds={categoryIds} size={size} />
        </Animated.View>
        <Svg width={28} height={22} style={styles.pointer}>
          <Path d="M 2 2 L 26 2 L 14 20 Z" fill={colors.text} stroke={colors.background} strokeWidth={2} />
        </Svg>
      </Pressable>

      <Button label={spinning ? 'Spinning…' : 'Spin'} size="lg" disabled={spinning} onPress={spin} style={{ marginTop: 24 }} />

      {state.history.length > 0 && (
        <>
          <View style={styles.scores}>
            {standings(state).map(({ player: p, score }) => (
              <View key={p.id} style={styles.scoreChip}>
                <Text style={{ fontSize: 13 }}>{p.emoji}</Text>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.scoreValue}>{score}</Text>
              </View>
            ))}
          </View>
          {!spinning && (
            <Button label="End game" variant="ghost" onPress={() => dispatch({ type: 'END_GAME' })} style={{ marginTop: 4 }} />
          )}
        </>
      )}
    </ScrollView>
  );
}

function CategoryTag({ id }: { id: CategoryId }) {
  const category = getCategory(id);
  return (
    <View style={styles.tag}>
      <View style={[styles.tagDot, { backgroundColor: category.color }]}>
        <Text style={{ fontSize: 13 }}>{category.emoji}</Text>
      </View>
      <Text style={styles.tagText}>{category.lead}</Text>
    </View>
  );
}

export function TaskView({ state, dispatch }: { state: DareState; dispatch: Dispatch }) {
  const player = turnPlayer(state);
  const card = state.card!;
  return (
    <ScrollView contentContainerStyle={[styles.page, { flexGrow: 1 }]}>
      <Text style={[type.label, { textAlign: 'center' }]}>{player.name}</Text>
      <View style={styles.card}>
        <CategoryTag id={card.category} />
        <Text style={styles.cardText}>{card.text}</Text>
      </View>
      <Button label="Done it" size="lg" onPress={() => dispatch({ type: 'JUDGE', outcome: 'done' })} style={{ marginTop: 20 }} />
      <Button
        label="Chickened out"
        variant="secondary"
        onPress={() => dispatch({ type: 'JUDGE', outcome: 'refused' })}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

export function ResultView({ state, dispatch }: { state: DareState; dispatch: Dispatch }) {
  const player = turnPlayer(state);
  const next = nextUp(state);
  const done = state.outcome === 'done';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {done ? (
        <View style={styles.verdict}>
          <Text style={[styles.status, { color: colors.success }]}>Done it</Text>
          <Text style={[styles.verdictBig, { color: colors.success }]}>+1</Text>
          <Text style={styles.turnSub}>{player.name} gets the point</Text>
        </View>
      ) : (
        <>
          <View style={styles.verdict}>
            <Text style={[styles.status, { color: colors.danger }]}>Chickened out</Text>
            <Text style={styles.turnSub}>No point for {player.name}. Time for a forfeit.</Text>
          </View>
          {state.forfeit && (
            <View style={styles.forfeit}>
              <Text style={type.label}>Forfeit</Text>
              <Text style={styles.forfeitText}>{state.forfeit.text}</Text>
              <Text style={[type.label, { marginTop: 4 }]}>Or the group picks one.</Text>
            </View>
          )}
        </>
      )}

      <Button
        label={done ? 'Take the point back' : `Changed your mind? ${player.name} did it`}
        variant="ghost"
        size="sm"
        onPress={() => dispatch({ type: 'JUDGE', outcome: done ? 'refused' : 'done' })}
        style={{ marginTop: 12 }}
      />
      <Button
        label={next ? `Next: ${next.name}` : 'See results'}
        size="lg"
        onPress={() => dispatch({ type: 'NEXT_TURN' })}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  turnName: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22 },
  turnMeta: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14, marginTop: 2 },
  turnSub: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 14, marginTop: 2, textAlign: 'center' },
  wheelWrap: { alignSelf: 'center', alignItems: 'center', marginTop: 20 },
  pointer: { position: 'absolute', top: 0 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '48%',
  },
  scoreName: { flexShrink: 1, fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  scoreValue: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13 },
  card: {
    flex: 1,
    minHeight: 280,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  cardText: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  verdict: { alignItems: 'center', paddingVertical: 28 },
  status: { fontFamily: fonts.semibold, fontSize: 15 },
  verdictBig: { fontFamily: fonts.display, fontSize: 56, marginTop: 8 },
  forfeit: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 20, alignItems: 'center', gap: 8 },
  forfeitText: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
});
