import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FiveMinuteTimer } from '../src/components/shared/FiveMinuteTimer';
import { useUserStore } from '../src/stores/useUserStore';
import { router } from 'expo-router';
import { COLORS } from '../src/utils/constants';

export default function ModalScreen() {
  const user = useUserStore(s => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <FiveMinuteTimer
        onClose={() => router.back()}
        userId={user?.id ?? ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
