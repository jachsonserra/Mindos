import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  Sidebar,
  SIDEBAR_COLLAPSED,
  SIDEBAR_EXPANDED,
} from '../../src/components/layout/Sidebar';
import { COLORS } from '../../src/utils/constants';
import { CheckInModal } from '../../src/components/ui/CheckInModal';
import { useCheckInStore } from '../../src/stores/useCheckInStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { CheckInNotificationManager } from '../../src/services/notifications/CheckInNotificationManager';
import { NotificationService } from '../../src/services/notifications/notificationService';

// Ponto de quebra: acima desta largura usa sidebar, abaixo usa bottom tabs
const DESKTOP_BREAKPOINT = 768;

export default function TabLayout() {
  const router                  = useRouter();
  const { width }               = useWindowDimensions();
  const isDesktop               = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const [collapsed, setCollapsed] = useState(false);

  // ── Check-in global ─────────────────────────────────────────────────────────
  const { user }        = useUserStore();
  const { modalOpen, modalPeriod, loadData, savePeriod, closeModal } = useCheckInStore();

  // Carrega dados do check-in assim que o usuário estiver disponível (dispara o auto-open)
  useEffect(() => {
    if (user?.id) { loadData(user.id); }
  }, [user?.id]);

  // Garante que os lembretes de check-in estejam agendados (uma vez por instalação)
  useEffect(() => {
    if (!user?.id) return;
    NotificationService.requestPermissions().then(granted => {
      if (granted) CheckInNotificationManager.ensureScheduled();
    });
  }, [user?.id]);

  // ── Opções compartilhadas de header ────────────────────────────────────────
  const sharedScreenOptions = {
    headerShown: false,
    // No desktop esconde completamente a tab bar (sidebar assume o controle)
    tabBarStyle: isDesktop
      ? { display: 'none' as const }
      : {
          backgroundColor: COLORS.surfaceDark,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          paddingBottom:   6,
          paddingTop:      6,
          height:          58,
          shadowColor:     COLORS.primary,
          shadowOpacity:   0.08,
          shadowRadius:    12,
          elevation:       6,
        },
    tabBarActiveTintColor:   COLORS.primary,
    tabBarInactiveTintColor: COLORS.textMuted,
    tabBarLabelStyle:        { fontSize: 9, fontWeight: '600' as const, marginTop: 1 },
  };

  // ── Telas da tab bar mobile ─────────────────────────────────────────────────
  const TAB_SCREENS = [
    { name: 'index',      title: 'Hoje',    icon: 'home'              },
    { name: 'routines',   title: 'Rotinas', icon: 'repeat'            },
    { name: 'objectives', title: 'Bússola', icon: 'compass'           },
    { name: 'agenda',     title: 'Agenda',  icon: 'calendar'          },
    { name: 'more',       title: 'Mais',    icon: 'grid-outline'      },
  ] as const;

  // ── Telas ocultas da tab bar (acessíveis via sidebar ou tela Mais) ─────────
  const HIDDEN_SCREENS = [
    'second-mind', 'tasks', 'missions',
    'progress', 'gratitude', 'studies',
    'insights', 'coach', 'habit-detail',
  ] as const;

  return (
    <View style={s.root}>
      {/* ── Sidebar (somente desktop) ──────────────────────────────────────── */}
      {isDesktop && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      )}

      {/* ── Modal de check-in global (aparece em qualquer tab) ────────────── */}
      {modalPeriod && user?.id && (
        <CheckInModal
          visible={modalOpen}
          period={modalPeriod}
          onSave={async (entry) => {
            // Save to DB — modal handles its own close after showing coaching step
            await savePeriod(user.id, modalPeriod, entry);
          }}
          onClose={closeModal}
        />
      )}

      {/* ── Área de conteúdo principal ─────────────────────────────────────── */}
      <View style={s.content}>
        <Tabs screenOptions={sharedScreenOptions}>

          {/* Telas visíveis no mobile tab bar */}
          {TAB_SCREENS.map(({ name, title, icon }) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title,
                tabBarIcon: ({ color }) => (
                  <Ionicons name={icon as any} size={20} color={color} />
                ),
              }}
            />
          ))}

          {/* Telas acessíveis via sidebar ou link direto — ocultas no mobile tab */}
          {HIDDEN_SCREENS.map((name) => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))}

        </Tabs>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
});
