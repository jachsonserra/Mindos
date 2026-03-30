import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useUserStore } from '../../stores/useUserStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../utils/constants';

// ── Dimensões ──────────────────────────────────────────────────────────────────
export const SIDEBAR_EXPANDED  = 220;
export const SIDEBAR_COLLAPSED = 58;

// ── Estrutura de navegação ─────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    section: 'PRINCIPAL',
    items: [
      { label: 'Hoje',          icon: 'home-outline',             activeIcon: 'home',             path: '/'                    },
      { label: 'Bússola',       icon: 'compass-outline',          activeIcon: 'compass',          path: '/(tabs)/objectives'   },
      { label: 'Agenda',        icon: 'calendar-outline',         activeIcon: 'calendar',         path: '/(tabs)/agenda'       },
    ],
  },
  {
    section: 'EXECUÇÃO',
    items: [
      { label: 'Rotinas',       icon: 'repeat-outline',           activeIcon: 'repeat',           path: '/(tabs)/routines'     },
      { label: 'Tarefas',       icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', path: '/(tabs)/tasks'        },
      { label: 'Estudos',       icon: 'book-outline',             activeIcon: 'book',             path: '/(tabs)/studies'      },
    ],
  },
  {
    section: 'CRESCIMENTO',
    items: [
      { label: 'Segunda Mente', icon: 'bulb-outline',             activeIcon: 'bulb',             path: '/(tabs)/second-mind'  },
      { label: 'Alma',          icon: 'heart-outline',            activeIcon: 'heart',            path: '/(tabs)/gratitude'    },
      { label: 'Insights',      icon: 'analytics-outline',        activeIcon: 'analytics',        path: '/(tabs)/insights'     },
      { label: 'Coach IA',      icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', path: '/(tabs)/coach'  },
    ],
  },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function getScreenName(path: string): string {
  // Remove o prefixo do grupo de tabs, se existir
  return path.replace('/(tabs)/', '').replace(/^\//, '');
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();

  const firstName = user?.name?.split(' ')[0] ?? 'Você';
  const width     = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  function isActive(path: string): boolean {
    // Home/index: ativo apenas quando está na raiz
    if (path === '/') {
      return pathname === '/' || pathname === '' || pathname === '/index';
    }
    const screen = getScreenName(path);
    return pathname === `/${screen}` || pathname.startsWith(`/${screen}/`);
  }

  function navigate(path: string) {
    router.push(path as any);
  }

  return (
    <View style={[s.sidebar, { width }]}>

      {/* ── Brand ── */}
      <View style={s.brand}>
        {!collapsed && (
          <View style={s.brandLogoRow}>
            <View style={s.brandDot} />
            <Text style={s.brandText}>MindOS</Text>
          </View>
        )}
        <TouchableOpacity
          style={[s.collapseBtn, collapsed && s.collapseBtnCentered]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={collapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}
            size={15}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* ── Navigation ── */}
      <View style={s.nav}>
        {NAV_GROUPS.map((group) => (
          <View key={group.section} style={s.group}>
            {!collapsed && (
              <Text style={s.sectionLabel}>{group.section}</Text>
            )}
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[
                    s.navItem,
                    active      && s.navItemActive,
                    collapsed   && s.navItemCollapsed,
                  ]}
                  onPress={() => navigate(item.path)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={(active ? item.activeIcon : item.icon) as any}
                    size={17}
                    color={active ? COLORS.primary : COLORS.textMuted}
                    style={s.navIcon}
                  />
                  {!collapsed && (
                    <Text
                      style={[s.navLabel, active && s.navLabelActive]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  )}
                  {/* Indicador barra lateral esquerda no item ativo */}
                  {active && <View style={s.activeBar} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Rodapé: Settings + user ── */}
      <View style={s.footer}>

        {/* Settings */}
        <TouchableOpacity
          style={[s.navItem, s.navItemSettings, collapsed && s.navItemCollapsed]}
          onPress={() => navigate('/settings')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="settings-outline"
            size={17}
            color={COLORS.textMuted}
            style={s.navIcon}
          />
          {!collapsed && (
            <Text style={s.navLabel} numberOfLines={1}>Configurações</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.footerDivider} />

        {/* User row */}
        <TouchableOpacity
          style={[s.userRow, collapsed && s.userRowCollapsed]}
          onPress={() => navigate('/settings')}
          activeOpacity={0.8}
        >
          {/* Avatar */}
          {user?.profileImageUri ? (
            <Image source={{ uri: user.profileImageUri }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarLetter}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          )}

          {!collapsed && (
            <View style={s.userInfo}>
              <Text style={s.userName} numberOfLines={1}>{firstName}</Text>
              <View style={s.planBadge}>
                <Text style={s.planBadgeText}>PRO</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  sidebar: {
    backgroundColor: COLORS.surfaceDark,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
    paddingVertical: SPACING.lg,
    overflow: 'hidden',
  },

  // Brand
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  brandText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collapseBtnCentered: {
    marginHorizontal: 'auto' as any,
  },

  // Nav
  nav: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    gap: 4,
  },
  group: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    paddingTop: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    position: 'relative',
    gap: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: SPACING.sm,
  },
  navIcon: {
    width: 18,
    textAlign: 'center',
  },
  navLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.sm,
    gap: 2,
  },
  navItemSettings: {
    marginBottom: SPACING.xs,
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  userRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  avatarLetter: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  planBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  planBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
