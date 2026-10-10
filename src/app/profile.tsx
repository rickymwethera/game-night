import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Icon, Screen, SectionHeader, TextField, Toggle, type IconName, type } from '../components/ui';
import { accountActions, useAccount } from '../core/account';
import { appActions, useAppState } from '../core/store';
import type { GameId } from '../core/types';
import { getGame } from '../games/registry';
import { colors, fonts, gradients, radius } from '../theme';

const AVATARS = ['🎲', '🦁', '🦏', '🐆', '🐘', '🦒', '🦓', '🎭', '🎤', '⚽', '🍖', '👑'];

export default function ProfileScreen() {
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen>
      <AppHeader variant="session" title="PROFILE & SETTINGS" onBack={back} hideProfile />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProfileHero />
        <EditProfile />
        <AccountSection />
        <SettingsSection />
        <Text style={styles.version}>Game Night v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </Screen>
  );
}

function ProfileHero() {
  const profile = useAppState((s) => s.profile);
  const history = useAppState((s) => s.history);
  const user = useAccount((s) => s.user);

  const counts = new Map<GameId, number>();
  history.forEach((g) => counts.set(g.gameId, (counts.get(g.gameId) ?? 0) + 1));
  const favourite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const favouriteGame = favourite ? getGame(favourite) : undefined;

  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.bigAvatar}>
          <Text style={{ fontSize: 40 }}>{profile.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName} numberOfLines={1}>
            {profile.displayName || 'Guest Player'}
          </Text>
          <View style={styles.heroStatus}>
            <Icon name={user ? 'cloud' : 'smartphone'} size={12} color={user ? colors.success : colors.coral} />
            <Text style={styles.heroStatusText} numberOfLines={1}>
              {user ? user.email : 'Guest • saved on this phone'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={String(history.length)} label="Games played" />
        <Stat value={favouriteGame ? `${favouriteGame.emoji} ${favouriteGame.title}` : '—'} label="Favourite game" />
      </View>
    </LinearGradient>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EditProfile() {
  const profile = useAppState((s) => s.profile);
  const [name, setName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(profile.avatar);
  // The saved profile can change under us (loaded from the phone, or pulled from the account after sign-in).
  const [shown, setShown] = useState(profile);
  if (shown !== profile) {
    setShown(profile);
    setName(profile.displayName);
    setAvatar(profile.avatar);
  }
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== profile.displayName || avatar !== profile.avatar;

  const save = async () => {
    setSaving(true);
    const { error } = await accountActions.saveProfile({ displayName: name.trim(), avatar });
    setSaving(false);
    setName(name.trim());
    setStatus(error ? { kind: 'error', text: `Saved on this phone, but not to your account: ${error}` } : { kind: 'saved', text: 'Saved' });
  };

  return (
    <>
      <SectionHeader title="Your Player Card" icon="user" iconColor={colors.primary} subtitle="How you show up at game night" />
      <View style={styles.card}>
        <TextField
          label="Display name"
          icon="edit-3"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setStatus(null);
          }}
          placeholder="e.g. Wanjiku"
          maxLength={30}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <Text style={[type.label, { marginTop: 18, marginBottom: 10 }]}>Avatar</Text>
        <View style={styles.avatars}>
          {AVATARS.map((a) => {
            const selected = a === avatar;
            return (
              <Pressable
                key={a}
                accessibilityRole="button"
                accessibilityLabel={`Avatar ${a}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setAvatar(a);
                  setStatus(null);
                }}
                style={[styles.avatarOption, selected && styles.avatarSelected]}
              >
                <Text style={{ fontSize: 22 }}>{a}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.saveRow}>
          {status && (
            <Text style={[styles.statusText, { color: status.kind === 'saved' ? colors.success : colors.danger }]}>
              {status.text}
            </Text>
          )}
          <Button
            label={saving ? 'Saving…' : 'Save'}
            icon="check"
            size="sm"
            disabled={!dirty || saving}
            onPress={save}
            style={{ marginLeft: 'auto' }}
          />
        </View>
      </View>
    </>
  );
}

function AccountSection() {
  const { configured, ready, user } = useAccount((s) => s);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.error) setError(result.error);
    else setConfirmDelete(false);
  };

  return (
    <>
      <SectionHeader title="Account" icon="shield" iconColor={colors.pink} subtitle="Optional. Every game works without one." />
      {!configured ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accounts are coming soon</Text>
          <Text style={[type.body, { marginTop: 6 }]}>
            Your name, avatar and game history are saved on this phone, so you can keep playing offline.
          </Text>
        </View>
      ) : !ready ? (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Take your player card anywhere</Text>
          <Text style={[type.body, { marginTop: 6 }]}>
            Create a free account to keep your name and avatar when you switch phones.
          </Text>
          <Button
            label="Create account"
            icon="user-plus"
            onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'sign-up' } })}
            style={{ marginTop: 18 }}
          />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'sign-in' } })}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Row icon="mail" title="Signed in as" detail={user.email} />
          <Row
            icon="calendar"
            title="Member since"
            detail={new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            last
          />
          <Button
            label="Sign out"
            icon="log-out"
            variant="secondary"
            disabled={busy}
            onPress={() => run(accountActions.signOut)}
            style={{ marginTop: 18 }}
          />
          {!confirmDelete ? (
            <Button
              label="Delete account"
              icon="trash-2"
              variant="ghost"
              disabled={busy}
              onPress={() => setConfirmDelete(true)}
              textStyle={{ color: colors.danger }}
              style={{ marginTop: 6 }}
            />
          ) : (
            <View style={styles.danger}>
              <Text style={styles.dangerTitle}>Delete your account for good?</Text>
              <Text style={[type.body, { marginTop: 6 }]}>
                Your account and online profile are erased and cannot be brought back. Game history on this phone stays.
              </Text>
              <View style={styles.dangerButtons}>
                <Button label="Keep it" variant="secondary" size="sm" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
                <Button
                  label={busy ? 'Deleting…' : 'Delete it'}
                  size="sm"
                  disabled={busy}
                  onPress={() => run(accountActions.deleteAccount)}
                  style={[{ flex: 1, backgroundColor: colors.danger }]}
                  textStyle={{ color: '#3B0907' }}
                />
              </View>
            </View>
          )}
        </View>
      )}
      {error && <Text style={[styles.statusText, { color: colors.danger, marginTop: 10 }]}>{error}</Text>}
    </>
  );
}

function SettingsSection() {
  const soundOn = useAppState((s) => s.soundOn);
  const adult = useAppState((s) => s.adultContent);
  const games = useAppState((s) => s.history.length);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <SectionHeader title="Settings" icon="sliders" iconColor={colors.coral} />
      <View style={styles.card}>
        <Row icon="volume-2" title="Buzz & haptics" detail="Countdown buzz and vibration during turns">
          <Toggle value={soundOn} onChange={appActions.setSoundOn} label="Buzz and haptics" />
        </Row>
        <Row icon="eye-off" title="18+ decks" detail="Show adults-only decks and content">
          <Toggle value={adult} onChange={appActions.setAdultContent} color={colors.pinkStrong} label="Adults-only content" />
        </Row>
        <Row icon="award" title="Game history" detail={`${games} ${games === 1 ? 'game' : 'games'} saved on this phone`} last>
          {confirmClear ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button label="Cancel" variant="secondary" size="sm" onPress={() => setConfirmClear(false)} />
              <Button
                label="Clear"
                size="sm"
                onPress={() => {
                  appActions.clearHistory();
                  setConfirmClear(false);
                }}
                style={{ backgroundColor: colors.danger }}
                textStyle={{ color: '#3B0907' }}
              />
            </View>
          ) : (
            <Button label="Clear" variant="secondary" size="sm" disabled={games === 0} onPress={() => setConfirmClear(true)} />
          )}
        </Row>
      </View>
    </>
  );
}

function Row({
  icon,
  title,
  detail,
  children,
  last,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail && (
          <Text style={styles.rowDetail} numberOfLines={2}>
            {detail}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  hero: { borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.surfaceHigh },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroName: { fontFamily: fonts.display, color: colors.text, fontSize: 26, letterSpacing: -0.5 },
  heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroStatusText: { flex: 1, fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1, backgroundColor: 'rgba(12,15,24,0.55)', borderRadius: 18, padding: 14 },
  statValue: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  statLabel: { fontFamily: fonts.semibold, color: colors.coral, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 },
  cardTitle: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 18 },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatarOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: { borderColor: colors.primary, backgroundColor: '#3A2F55' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  statusText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceHigh },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  rowDetail: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  danger: {
    marginTop: 14,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: 'rgba(255,138,128,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,138,128,0.35)',
  },
  dangerTitle: { fontFamily: fonts.bold, color: colors.danger, fontSize: 15 },
  dangerButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  version: { fontFamily: fonts.medium, color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 28 },
});
