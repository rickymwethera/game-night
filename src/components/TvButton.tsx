import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TvSenderStatus } from '../core/tv';
import { isTvCode, normalizeTvCode, TV_CODE_LENGTH } from '../core/tvLink';
import { colors, fonts, radius } from '../theme';
import { Button, CircleButton, TextField, type } from './ui';

/** Where to point the TV's browser. Set EXPO_PUBLIC_TV_URL once the web app is hosted. */
function tvAddress(): string | null {
  if (process.env.EXPO_PUBLIC_TV_URL) return process.env.EXPO_PUBLIC_TV_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/tv`;
  return null;
}

/** The TV button in a game's top bar, and the sheet for linking a TV by its code. */
export function TvButton({
  tv,
}: {
  tv: { code: string | null; status: TvSenderStatus; link: (code: string) => void; unlink: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const code = normalizeTvCode(input);
  const address = tvAddress();

  return (
    <>
      <CircleButton
        icon="tv"
        label={tv.status === 'live' ? 'Showing on TV' : 'Show on TV'}
        variant={tv.status === 'live' ? 'primary' : 'dark'}
        size={40}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Pressable style={styles.sheet} onPress={() => {}}>
            {tv.status === 'off' ? (
              <>
                <Text style={styles.title}>Show on TV</Text>
                <Text style={type.body}>
                  {address ? `On the TV or a laptop, open ${address}` : "On the TV or a laptop, open Game Night's TV page"} and
                  type the {TV_CODE_LENGTH}-letter code it shows.
                </Text>
                <TextField
                  label="TV code"
                  icon="tv"
                  value={code}
                  onChangeText={setInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  maxLength={TV_CODE_LENGTH + 2}
                  placeholder="ABCD"
                  onSubmitEditing={() => isTvCode(code) && tv.link(code)}
                />
                <Button label="Connect" disabled={!isTvCode(code)} onPress={() => tv.link(code)} />
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  {tv.status === 'live' ? 'Showing on TV' : tv.status === 'error' ? "Couldn't reach the TV" : 'Looking for the TV'}
                </Text>
                <Text style={type.body}>
                  {tv.status === 'live'
                    ? 'Everyone can follow along on the big screen. Answers stay on this phone.'
                    : tv.status === 'error'
                      ? 'Check this phone is online, then try again.'
                      : 'Make sure the TV is showing this code.'}
                </Text>
                <Text style={styles.code}>{tv.code}</Text>
                <Button
                  label={tv.status === 'error' ? 'Try another code' : 'Stop showing on TV'}
                  variant="secondary"
                  onPress={() => {
                    tv.unlink();
                    setInput('');
                  }}
                />
              </>
            )}
            <Button label="Done" variant="ghost" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 16,
    padding: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  code: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 8, color: colors.primary, textAlign: 'center' },
});
