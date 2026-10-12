import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Logo } from '../components/ui';
import { tvAvailable, useTvReceiver } from '../core/tv';
import { isTvCode, makeTvCode, toLocalTime } from '../core/tvLink';
import { TriviaTvView } from '../games/trivia/TvView';
import { colors, fonts } from '../theme';

/**
 * The big screen. Open /tv in the TV's browser, then type the code it shows
 * into "Show on TV" on the host's phone. The code is kept in the address so a
 * reload stays in the same room.
 */
export default function TvScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code] = useState(() => (params.code && isTvCode(params.code) ? params.code : makeTvCode()));
  useEffect(() => {
    if (params.code !== code) router.setParams({ code });
  }, [params.code, code]);
  useKeepAwake('tv', { suppressDeactivateWarnings: true });

  const { width, height } = useWindowDimensions();
  const scale = Math.max(0.4, Math.min(width / 1280, height / 720));
  const z = (n: number) => n * scale;

  const { received, connected } = useTvReceiver(code);
  const screen = received?.screen;

  let body;
  if (!tvAvailable) {
    body = <Waiting z={z} title="TV mode isn't set up" detail="This version of Game Night has no online keys, so phones can't reach the TV." />;
  } else if (!screen) {
    body = (
      <Waiting
        z={z}
        title="Show Game Night on this screen"
        detail="On the host's phone, start a game of Trivia, tap the TV button and enter this code."
        code={code}
        footer={connected ? 'Ready for a phone' : 'Connecting…'}
      />
    );
  } else if (!screen.state) {
    body = <Waiting z={z} title="Trivia" detail="The host is picking the packs and teams…" />;
  } else {
    const endsAt = screen.state.endsAt == null ? null : toLocalTime(screen.state.endsAt, received.sentAt, received.receivedAt);
    body = <TriviaTvView state={screen.state} endsAt={endsAt} z={z} />;
  }

  return <View style={[styles.screen, { padding: z(48) }]}>{body}</View>;
}

function Waiting({ z, title, detail, code, footer }: { z: (n: number) => number; title: string; detail: string; code?: string; footer?: string }) {
  return (
    <View style={styles.center}>
      <Logo size={z(72)} />
      <Text style={{ fontFamily: fonts.display, fontSize: z(56), color: colors.text, marginTop: z(24), textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: z(28), color: colors.textMuted, marginTop: z(12), textAlign: 'center', maxWidth: z(900) }}>
        {detail}
      </Text>
      {code && (
        <View style={{ flexDirection: 'row', gap: z(16), marginTop: z(40) }}>
          {code.split('').map((c, i) => (
            <View key={i} style={{ width: z(120), height: z(150), borderRadius: z(28), backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: z(96), color: colors.primary }}>{c}</Text>
            </View>
          ))}
        </View>
      )}
      {footer && <Text style={{ fontFamily: fonts.semibold, fontSize: z(22), color: colors.textDim, marginTop: z(32) }}>{footer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
