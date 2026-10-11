import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Icon, Logo, Screen, Segmented, TextField, type } from '../components/ui';
import { accountActions } from '../core/account';
import { useAppState } from '../core/store';
import { colors, fonts, radius } from '../theme';

type Mode = 'sign-up' | 'sign-in';
const MODES: readonly Mode[] = ['sign-up', 'sign-in'];

export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const savedName = useAppState((s) => s.profile.displayName);
  const [mode, setMode] = useState<Mode>(params.mode === 'sign-in' ? 'sign-in' : 'sign-up');
  const [name, setName] = useState(savedName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const signUp = mode === 'sign-up';
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Passwords need at least 6 characters.');
    setBusy(true);
    if (signUp) {
      const result = await accountActions.signUp(email, password, name);
      setBusy(false);
      if (result.error) return setError(result.error);
      if (result.needsConfirmation) return setCheckEmail(true);
    } else {
      const result = await accountActions.signIn(email, password);
      setBusy(false);
      if (result.error) return setError(result.error);
    }
    back();
  };

  if (checkEmail) {
    return (
      <Screen>
        <AppHeader variant="session" title="Check your email" onBack={back} hideProfile />
        <View style={styles.done}>
          <View style={styles.mailCircle}>
            <Icon name="mail" size={36} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>One last step</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>
            We sent a link to <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{email.trim()}</Text>. Tap it to
            confirm your account, then come back and sign in.
          </Text>
          <Button
            label="I've confirmed, sign me in"
            iconRight="arrow-right"
            onPress={() => {
              setCheckEmail(false);
              setMode('sign-in');
            }}
            style={{ marginTop: 24, alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader variant="session" title={signUp ? 'Create account' : 'Sign in'} onBack={back} hideProfile />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Logo size={56} />
            <Text style={styles.title}>{signUp ? 'Join the party' : 'Welcome back'}</Text>
            <Text style={[type.body, { textAlign: 'center' }]}>
              {signUp
                ? 'Keep your player card when you switch phones. Games always work without an account.'
                : 'Sign in to bring your player card to this phone.'}
            </Text>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Segmented
              options={MODES}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError(null);
              }}
              format={(m) => (m === 'sign-up' ? 'Create account' : 'Sign in')}
            />
          </View>

          <View style={styles.card}>
            {signUp && (
              <TextField
                label="Display name"
                icon="user"
                value={name}
                onChangeText={setName}
                placeholder="What should we call you?"
                maxLength={30}
                autoCapitalize="words"
              />
            )}
            <TextField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder={signUp ? 'At least 6 characters' : 'Your password'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={signUp ? 'new-password' : 'current-password'}
              textContentType={signUp ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                </Pressable>
              }
            />
            {error && (
              <View style={styles.error}>
                <Icon name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <Button
              label={busy ? 'One moment…' : signUp ? 'Create account' : 'Sign in'}
              iconRight={busy ? undefined : 'arrow-right'}
              size="lg"
              disabled={busy}
              onPress={submit}
              style={{ marginTop: 6 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  intro: { alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 22 },
  title: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 24, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, gap: 16 },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,138,128,0.1)',
    borderRadius: radius.sm,
    padding: 12,
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, color: colors.danger, fontSize: 13 },
  done: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 12 },
  mailCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
