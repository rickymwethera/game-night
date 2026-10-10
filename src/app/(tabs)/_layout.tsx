import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/ui';
import { colors, fonts } from '../../theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'grid' },
  games: { label: 'Games', icon: 'layout' },
  decks: { label: 'Decks', icon: 'layers' },
  history: { label: 'History', icon: 'award' },
};

function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Icon name={tab.icon} size={20} color={focused ? colors.primary : colors.textMuted} />
              <Text style={[styles.label, focused && { color: colors.primary }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="games" />
      <Tabs.Screen name="decks" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 8 },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLow,
    borderRadius: 32,
    padding: 8,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 24, gap: 4 },
  itemActive: { backgroundColor: colors.surfaceHighest },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
});
