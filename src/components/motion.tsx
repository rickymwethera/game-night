import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, TEAM_PALETTE } from '../theme';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * Fades its children in with a small upward drift when it mounts. Give it a
 * `key` that changes with each step of a game so every step eases in.
 */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View style={[{ flex: 1, opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

const CONFETTI_COLORS = [colors.primary, colors.success, ...TEAM_PALETTE.map((t) => t.color)];
const PIECES = 48;
const DURATION = 2200;

/**
 * A one-off confetti burst over the whole screen. Renders nothing unless
 * `active`; touches pass straight through. Skipped when the phone asks for
 * reduced motion.
 */
export function Confetti({ active }: { active: boolean }) {
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const power = 0.35 + Math.random() * 0.65;
        return {
          // Each piece bursts out from one point, then drifts down like paper.
          burstX: Math.cos(angle) * width * 0.45 * power,
          burstY: Math.sin(angle) * height * 0.18 * power - height * 0.08,
          drift: (Math.random() - 0.5) * 80,
          delay: Math.random() * 0.08,
          fall: height * (0.55 + Math.random() * 0.3),
          spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360),
          w: 6 + Math.random() * 5,
          h: 10 + Math.random() * 6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        };
      }),
    [width, height],
  );

  useEffect(() => {
    if (!active || reduce) return;
    progress.setValue(0);
    setDone(false);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(() => setDone(true));
    return () => anim.stop();
  }, [active, reduce, progress]);

  if (!active || reduce || done) return null;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const start = p.delay;
        const local = progress.interpolate({
          inputRange: [0, start, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width / 2 - p.w / 2,
              top: height * 0.3,
              width: p.w,
              height: p.h,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: local.interpolate({ inputRange: [0, 0.01, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: local.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, p.burstX, p.burstX + p.drift] }) },
                { translateY: local.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, p.burstY, p.burstY + p.fall] }) },
                { rotate: local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </Animated.View>
  );
}
