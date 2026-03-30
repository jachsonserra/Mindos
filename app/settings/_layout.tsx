import { Stack } from 'expo-router';
import { COLORS } from '../../src/utils/constants';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700', color: COLORS.text },
        contentStyle: { backgroundColor: COLORS.background },
        title: 'Configurações',
      }}
    />
  );
}
