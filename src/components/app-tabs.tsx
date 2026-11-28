import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export default function AppTabs() {
  const { colorScheme } = useThemePreference();
  const colors = Colors[colorScheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="expenses">
        <NativeTabs.Trigger.Label>Menot</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="eurosign.circle.fill" md="payments" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="categories">
        <NativeTabs.Trigger.Label>Luokat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="folder.fill" md="folder" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="summary">
        <NativeTabs.Trigger.Label>Koosteet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Asetukset</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
