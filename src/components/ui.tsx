import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useAppState } from '../core/store';
import { colors, fonts, radius, spacing } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 18, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
}

/** The Game Night mark: a dice face with four pips. */
export function Logo({ size = 40 }: { size?: number }) {
  const pip = size * 0.16;
  const dots = [0, 1, 2, 3];
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <View style={[styles.logoFace, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.16 }]}>
        {dots.map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: pip,
              height: pip,
              borderRadius: pip / 2,
              backgroundColor: colors.primary,
              top: i < 2 ? size * 0.08 : undefined,
              bottom: i >= 2 ? size * 0.08 : undefined,
              left: i % 2 === 0 ? size * 0.08 : undefined,
              right: i % 2 === 1 ? size * 0.08 : undefined,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function CircleButton({
  icon,
  onPress,
  variant = 'dark',
  size = 44,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  variant?: 'dark' | 'primary';
  size?: number;
  label: string;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: primary ? colors.primary : colors.surfaceHigh, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Icon name={icon} size={size * 0.42} color={primary ? colors.onPrimary : colors.text} />
    </Pressable>
  );
}

/** The round button in the top bar. Shows the player's avatar and opens Profile & Settings. */
export function ProfileButton({ size = 40 }: { size?: number }) {
  const avatar = useAppState((s) => s.profile.avatar);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      onPress={() => router.push('/profile')}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHigh, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{avatar}</Text>
    </Pressable>
  );
}

/** Top bar. "brand" shows the logo and app name; "session" is the in-game bar with a back button. */
export function AppHeader(
  props:
    | { variant: 'brand' }
    | { variant: 'session'; title: string; onBack: () => void; backIcon?: IconName; hideProfile?: boolean },
) {
  if (props.variant === 'session') {
    return (
      <View style={styles.header}>
        <CircleButton icon={props.backIcon ?? 'arrow-left'} label="Back" onPress={props.onBack} size={40} />
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {props.title}
        </Text>
        {!props.hideProfile && <ProfileButton />}
      </View>
    );
  }
  return (
    <View style={styles.header}>
      <Logo size={32} />
      <Text style={styles.brandTitle}>Game Night</Text>
      <ProfileButton />
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const look = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceHigh, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.primary },
  }[variant];
  const pad = { sm: 8, md: 14, lg: 22 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: look.bg, paddingVertical: pad, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={fontSize + 2} color={look.fg} />}
      <Text style={[styles.buttonText, { color: look.fg, fontSize }, textStyle]}>
        {label}
      </Text>
      {iconRight && <Icon name={iconRight} size={fontSize + 2} color={look.fg} />}
    </Pressable>
  );
}

export function Pill({
  label,
  icon,
  bg = colors.surfaceHigh,
  fg = colors.textMuted,
  style,
}: {
  label: string;
  icon?: IconName;
  bg?: string;
  fg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon && <Icon name={icon} size={11} color={fg} />}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && <Icon name={icon} size={13} color={selected ? colors.onPrimary : colors.textMuted} />}
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

/** A row that hides its contents until tapped. Used for settings most groups never change. */
export function Disclosure({ title, summary, children }: { title: string; summary?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.disclosureRow}
      >
        <Text style={styles.disclosureTitle}>{title}</Text>
        {!open && summary && (
          <Text style={styles.disclosureSummary} numberOfLines={1}>
            {summary}
          </Text>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
      </Pressable>
      {open && <View style={styles.disclosureBody}>{children}</View>}
    </View>
  );
}

export function Toggle({
  value,
  onChange,
  color = colors.primary,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? color : colors.surfaceHighest }]}
    >
      <View style={[styles.knob, value ? { right: 4 } : { left: 4, backgroundColor: colors.textDim }]} />
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  format = String,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={String(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o)}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.segmentText, active && { color: colors.onPrimary }]}>{format(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View style={styles.stepper}>
      <CircleButton
        icon="minus"
        size={36}
        label={`Decrease ${label}`}
        onPress={value > min ? () => onChange(value - 1) : undefined}
      />
      <Text style={styles.stepperValue}>{value}</Text>
      <CircleButton
        icon="plus"
        size={36}
        label={`Increase ${label}`}
        onPress={value < max ? () => onChange(value + 1) : undefined}
      />
    </View>
  );
}

export function TextField({
  label,
  icon,
  right,
  ...input
}: ComponentProps<typeof TextInput> & { label: string; icon?: IconName; right?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.field}>
        {icon && <Icon name={icon} size={18} color={colors.textMuted} />}
        <TextInput
          placeholderTextColor={colors.textDim}
          accessibilityLabel={label}
          {...input}
          style={[styles.fieldInput, input.style]}
        />
        {right}
      </View>
    </View>
  );
}

export const type = StyleSheet.create({
  display: { fontFamily: fonts.display, color: colors.text, letterSpacing: -0.5 },
  body: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textDim },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  logo: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  logoFace: { backgroundColor: colors.surfaceLowest },
  circle: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brandTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 19, color: colors.text },
  sessionTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 17, color: colors.text },
  button: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bold },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 11 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 12, gap: 12 },
  sectionTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  disclosure: { backgroundColor: colors.surface, borderRadius: radius.md },
  disclosureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  disclosureTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  disclosureSummary: { flex: 1, textAlign: 'right', fontFamily: fonts.body, fontSize: 13, color: colors.textDim },
  disclosureBody: { paddingHorizontal: 16, paddingBottom: 16 },
  toggle: { width: 52, height: 30, borderRadius: 15, justifyContent: 'center' },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#F4EFFF' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill },
  segmentText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.pill,
    padding: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  fieldInput: { flex: 1, paddingVertical: 14, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  stepperValue: { fontFamily: fonts.display, fontSize: 20, color: colors.text, minWidth: 32, textAlign: 'center' },
});
