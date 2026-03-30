import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/stores/useUserStore';
import { useGamificationStore } from '../../src/stores/useGamificationStore';
import { COLORS } from '../../src/utils/constants';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { getLevelTitle, getLevelProgressPercent, getXPForNextLevel, calculateCurrentLevelXP } from '../../src/services/gamification/xpEngine';
import type { Mission, Reward } from '../../src/types/gamification.types';

const MISSION_ICONS: Record<Mission['type'], string> = {
  daily: '☀️', weekly: '📅', challenge: '⚔️', phase: '🌟',
};
const MISSION_TYPE_LABELS: Record<Mission['type'], string> = {
  daily: 'Diária', weekly: 'Semanal', challenge: 'Desafio', phase: 'Fase',
};

export default function MissionsScreen() {
  const user = useUserStore(s => s.user);
  const { missions, rewards, userXP, todayXPEarned, loadData, completeMission, createReward, unlockReward } = useGamificationStore();
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);

  // Recarrega ao focar
  useFocusEffect(
    useCallback(() => { if (user?.id) loadData(user.id); }, [user?.id])
  );

  const activeMissions = missions.filter(m => m.status === 'active');
  const completedMissions = missions.filter(m => m.status === 'completed');

  // XP / Level
  const level = userXP?.level ?? 1;
  const totalXP = userXP?.totalXp ?? 0;
  const levelTitle = getLevelTitle(level);
  const levelPct = getLevelProgressPercent(totalXP);
  const xpToNext = getXPForNextLevel(level);
  const currentLevelXP = calculateCurrentLevelXP(totalXP);
  const xpToday = todayXPEarned ?? 0;

  const getMissionTypeColor = (type: Mission['type']): string => {
    const colors: Record<Mission['type'], string> = { daily: COLORS.success, weekly: COLORS.primary, challenge: COLORS.warning, phase: '#FF4500' };
    return colors[type];
  };

  const handleCreateReward = async () => {
    if (!user || !rewardTitle.trim()) return;
    await createReward({
      userId: user.id,
      title: rewardTitle.trim(),
      description: rewardDesc.trim(),
      isUnlocked: false,
      type: 'custom',
    });
    setRewardTitle('');
    setRewardDesc('');
    setShowAddReward(false);
  };

  const handleUnlockReward = (reward: Reward) => {
    if (!user) return;
    setPendingReward(reward);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>🎯 Missões</Text>

        {/* XP Banner melhorado */}
        <Card style={styles.xpBanner} variant="elevated">
          <View style={styles.xpBannerTop}>
            <View style={styles.xpLevelBadge}>
              <Text style={styles.xpLevelNum}>{level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.xpLevelTitle}>{levelTitle}</Text>
              <Text style={styles.xpLevelSub}>{totalXP} XP total</Text>
            </View>
            <View style={styles.xpTodayPill}>
              <Text style={styles.xpTodayVal}>+{xpToday}</Text>
              <Text style={styles.xpTodayLbl}>hoje</Text>
            </View>
          </View>
          <ProgressBar
            value={currentLevelXP}
            max={xpToNext}
            color={COLORS.primary}
            height={8}
            showLabel
            label={`${currentLevelXP} / ${xpToNext} XP → Nível ${level + 1}`}
          />
        </Card>

        {/* Missões Ativas */}
        <Text style={styles.sectionTitle}>Missões Ativas ({activeMissions.length})</Text>

        {activeMissions.map(mission => {
          const pct = mission.requirementValue > 0
            ? Math.min((mission.requirementCurrent / mission.requirementValue) * 100, 100)
            : 0;
          const color = getMissionTypeColor(mission.type);
          const isComplete = pct >= 100;

          return (
            <Card key={mission.id} style={[styles.missionCard, isComplete && styles.missionCardReady]} variant="bordered">
              {/* Cabeçalho: icon + badge + XP */}
              <View style={styles.missionHead}>
                <View style={[styles.missionIconWrap, { backgroundColor: `${color}20` }]}>
                  <Text style={styles.missionIcon}>{MISSION_ICONS[mission.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.missionTitleRow}>
                    <Badge label={MISSION_TYPE_LABELS[mission.type]} color={color} size="sm" />
                    {mission.expiresAt && (
                      <Text style={styles.missionExpiry}>
                        ⏰ {new Date(mission.expiresAt).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  {!!mission.description && (
                    <Text style={styles.missionDesc} numberOfLines={2}>{mission.description}</Text>
                  )}
                </View>
              </View>

              {/* Barra de progresso */}
              <ProgressBar
                value={mission.requirementCurrent}
                max={mission.requirementValue}
                color={isComplete ? COLORS.success : color}
                height={8}
                style={styles.missionBar}
              />

              {/* Rodapé: progresso + XP + botão */}
              <View style={styles.missionFoot}>
                <Text style={styles.missionProgressText}>
                  {mission.requirementCurrent}/{mission.requirementValue}
                  {' '}·{' '}
                  <Text style={{ color, fontWeight: '700' }}>{Math.round(pct)}%</Text>
                </Text>
                <View style={styles.missionRight}>
                  <Text style={styles.missionXP}>+{mission.xpReward} XP</Text>
                  {isComplete && user?.id && (
                    <TouchableOpacity
                      style={styles.claimBtn}
                      onPress={() => completeMission(mission.id, user.id)}
                    >
                      <Text style={styles.claimBtnTxt}>Resgatar!</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          );
        })}

        {activeMissions.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma missão ativa. Volte amanhã!</Text>
          </Card>
        )}

        {/* Mural de Recompensas */}
        <View style={styles.rewardHeader}>
          <Text style={styles.sectionTitle}>Mural de Recompensas</Text>
          <TouchableOpacity onPress={() => setShowAddReward(true)} style={styles.addRewardBtn}>
            <Text style={styles.addRewardBtnText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rewardsGrid}>
          {rewards.map(reward => (
            <TouchableOpacity
              key={reward.id}
              style={[styles.rewardCard, reward.isUnlocked && styles.rewardCardUnlocked]}
              onPress={() => !reward.isUnlocked && handleUnlockReward(reward)}
              activeOpacity={0.8}
            >
              <Text style={styles.rewardEmoji}>{reward.isUnlocked ? '🎉' : '🔒'}</Text>
              <Text style={[styles.rewardTitle, reward.isUnlocked && styles.rewardTitleUnlocked]}>
                {reward.title}
              </Text>
              {reward.description && (
                <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
              )}
              {reward.isUnlocked && (
                <Text style={styles.rewardUnlockedBadge}>✓ Conquistado!</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addRewardCard} onPress={() => setShowAddReward(true)}>
            <Text style={styles.addRewardCardIcon}>+</Text>
            <Text style={styles.addRewardCardText}>Nova recompensa</Text>
          </TouchableOpacity>
        </View>

        {/* Missões Completadas */}
        {completedMissions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              Completadas ({completedMissions.length})
            </Text>
            {completedMissions.slice(0, 5).map(mission => (
              <Card key={mission.id} style={[styles.missionCard, styles.missionCompleted]} variant="bordered">
                <View style={styles.missionHead}>
                  <Text style={styles.missionIcon}>{MISSION_ICONS[mission.type]}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.missionTitleRow}>
                      <Badge label="✓ Completa" color={COLORS.success} size="sm" />
                      <Text style={styles.missionXP}>+{mission.xpReward} XP</Text>
                    </View>
                    <Text style={[styles.missionTitle, styles.missionTitleDone]}>{mission.title}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal Adicionar Recompensa */}
      <Modal visible={showAddReward} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddReward(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddReward(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nova Recompensa</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>O que você vai ganhar?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Assistir 1 episódio da série favorita"
              placeholderTextColor={COLORS.textSecondary}
              value={rewardTitle}
              onChangeText={setRewardTitle}
              autoFocus
            />

            <Text style={styles.inputLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Detalhes da recompensa..."
              placeholderTextColor={COLORS.textSecondary}
              value={rewardDesc}
              onChangeText={setRewardDesc}
              multiline
            />

            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Missão Mural: vincule uma recompensa a uma missão (ex: "estudar 30min = jogar 20min")
              </Text>
            </View>

            <Button
              title="Criar Recompensa"
              onPress={handleCreateReward}
              disabled={!rewardTitle.trim()}
              size="lg"
              style={styles.modalBtn}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: confirmar desbloqueio de recompensa ── */}
      <Modal visible={!!pendingReward} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>🎁 Desbloquear recompensa?</Text>
            <Text style={{ fontSize: 15, color: COLORS.text, textAlign: 'center', fontWeight: '600' }} numberOfLines={2}>
              "{pendingReward?.title}"
            </Text>
            {!!pendingReward?.xpCost && (
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' }}>
                Custa {pendingReward.xpCost} XP
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, alignItems: 'center' }}
                onPress={() => setPendingReward(null)}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' }}
                onPress={() => { if (pendingReward && user) { unlockReward(pendingReward.id, user.id); } setPendingReward(null); }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Desbloquear! 🎉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  xpBanner: { marginBottom: 20 },
  xpBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  xpLevelBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  xpLevelNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
  xpLevelTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  xpLevelSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  xpTodayPill: {
    alignItems: 'center', backgroundColor: `${COLORS.warning}18`,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  xpTodayVal: { fontSize: 14, fontWeight: '800', color: COLORS.warning },
  xpTodayLbl: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  missionCard: { marginBottom: 10 },
  missionCardReady: { borderColor: COLORS.success, borderWidth: 1.5 },
  missionCompleted: { opacity: 0.6 },
  missionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  missionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionIcon: { fontSize: 18 },
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  missionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  missionTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  missionXP: { fontSize: 13, color: COLORS.warning, fontWeight: '800' },
  missionDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  missionBar: { marginBottom: 8 } as any,
  missionFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  missionProgressText: { fontSize: 12, color: COLORS.textSecondary },
  missionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionExpiry: { fontSize: 11, color: COLORS.error },
  claimBtn: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  claimBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  rewardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  addRewardBtn: { backgroundColor: COLORS.primary + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addRewardBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  rewardCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  rewardCardUnlocked: { borderColor: COLORS.success + '60', backgroundColor: COLORS.success + '10' },
  rewardEmoji: { fontSize: 28, marginBottom: 8 },
  rewardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  rewardTitleUnlocked: { color: COLORS.text },
  rewardDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  rewardUnlockedBadge: { fontSize: 11, color: COLORS.success, fontWeight: '700', marginTop: 6 },
  addRewardCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addRewardCardIcon: { fontSize: 28, color: COLORS.textSecondary, marginBottom: 6 },
  addRewardCardText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { alignItems: 'center', padding: 24, marginBottom: 20 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  modalClose: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  tipBox: { backgroundColor: COLORS.primary + '15', borderRadius: 12, padding: 14, marginBottom: 20 },
  tipText: { color: COLORS.primary, fontSize: 13, lineHeight: 20 },
  modalBtn: { marginBottom: 40 },
});
