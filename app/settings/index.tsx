import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../src/stores/useLanguageStore";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getLevelTitle } from "../../src/services/gamification/xpEngine";
import { NotificationService } from "../../src/services/notifications/notificationService";
import { CheckInNotificationManager } from "../../src/services/notifications/CheckInNotificationManager";
import { AnthropicKeyService } from "../../src/services/ai/AnthropicKeyService";
import { DataExportService } from "../../src/services/export/DataExportService";
import {
    clearSupabaseCredentials,
    getSupabaseClient,
    hasSupabaseCredentials,
    saveSupabaseCredentials,
    testSupabaseConnection,
} from "../../src/services/sync/supabaseClient";
import {
    clearSyncHistory,
    getLastSyncDate,
    getSupabaseSchema,
    syncData,
    type SyncResult,
} from "../../src/services/sync/syncService";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useGamificationStore } from "../../src/stores/useGamificationStore";
import { useHabitStore } from "../../src/stores/useHabitStore";
import { useObjectiveStore } from "../../src/stores/useObjectiveStore";
import { useSmarterGoalStore } from "../../src/stores/useSmarterGoalStore";
import { useTaskStore } from "../../src/stores/useTaskStore";
import { useUserStore } from "../../src/stores/useUserStore";
import { COLORS, PHASES } from "../../src/utils/constants";

// ─── Fases ────────────────────────────────────────────────────────────────────
const PHASE_DETAILS = {
  1: {
    emoji: "🌱",
    name: "Anel da Terra",
    subtitle: "Diagnóstico e Preparação",
    color: "#8B4513",
    howToUnlock: "Fase inicial — já desbloqueada",
    description:
      "Você está na fundação. Aqui o objetivo é se conhecer: entender seus padrões, gatilhos e o seu porquê central. Sem diagnóstico, não há cura.",
    tools: [
      "Definir o Porquê Central (âncora emocional)",
      "Criar os primeiros hábitos",
      "Registrar rotina matinal",
    ],
  },
  2: {
    emoji: "🔥",
    name: "Início do Dia",
    subtitle: "Quebra da Inércia",
    color: "#FF8C00",
    howToUnlock: "Complete 500 XP na Fase 1",
    description:
      "A inércia é o maior inimigo. Nesta fase você aprende a atacar o dia antes que ele te ataque. Priming matinal, regra dos 5 segundos e primeira vitória.",
    tools: [
      "Regra dos 5 segundos",
      "Priming matinal",
      "Primeira vitória do dia",
      "Bloqueio de dopamina",
    ],
  },
  3: {
    emoji: "⚔️",
    name: "Ação Imediata",
    subtitle: "Mushin e Fudoshin",
    color: "#DC143C",
    howToUnlock: "Complete 1.000 XP acumulado",
    description:
      "Mushin = mente sem mente (agir sem pensar demais). Fudoshin = mente inabalável. Aqui você treina agir apesar do medo, da dor ou do desconforto.",
    tools: [
      "Modo raiva construtiva (Fogo)",
      "Regra dos 2 minutos",
      "Fudoshin — mente inabalável",
    ],
  },
  4: {
    emoji: "💧",
    name: "Anel da Água",
    subtitle: "Consistência e Sistemas",
    color: "#1E90FF",
    howToUnlock: "Complete 2.500 XP acumulado",
    description:
      "A água não para — ela flui. Aqui você cria sistemas que funcionam mesmo quando a motivação vai embora. Hábitos em loop, rotinas blindadas, nunca falhe duas vezes.",
    tools: [
      "Loop do hábito completo",
      "Never Miss Twice",
      "Intenções de implementação",
      "Revisão semanal",
    ],
  },
  5: {
    emoji: "🎮",
    name: "Gamificação",
    subtitle: "Hackeando a Dopamina",
    color: "#9400D3",
    howToUnlock: "Complete 5.000 XP acumulado",
    description:
      "Seu cérebro ama recompensas. Aqui você hackeamos a dopamina a seu favor: XP, streaks, missões, níveis e recompensas reais para cada conquista.",
    tools: [
      "Sistema de XP e níveis",
      "Missões diárias e semanais",
      "Streaks e recompensas",
      "Cookie Jar de vitórias",
    ],
  },
  6: {
    emoji: "👑",
    name: "Maestria",
    subtitle: "Anéis do Fogo, Vento e Vazio",
    color: "#FFD700",
    howToUnlock: "Complete 10.000 XP acumulado",
    description:
      "O vazio é onde mora a maestria. Você não precisa mais de motivação — a disciplina virou identidade. Metas SMARTER, Pareto 80/20, revisão trimestral.",
    tools: [
      "Metas SMARTER avançadas",
      "Pareto 80/20 nas tarefas",
      "Segunda Mente ativa",
      "Revisão trimestral de vida",
    ],
  },
} as const;

// ─── Perguntas do Wizard de Propósito ────────────────────────────────────────
const WHY_QUESTIONS = [
  {
    step: 1,
    emoji: "💭",
    title: "O que você mais quer mudar na sua vida?",
    hint: 'Não pense no "como" ainda. Apenas o que dói, o que te frustra ou o que você sonha ter diferente.',
    placeholder:
      "Ex: Quero ter mais saúde e energia, sair das dívidas, construir algo meu...",
  },
  {
    step: 2,
    emoji: "❤️",
    title: "Por que isso é importante para você?",
    hint: 'Vá fundo. A resposta superficial geralmente não é o verdadeiro porquê. Pergunte "e por quê isso importa?" até chegar na emoção real.',
    placeholder:
      "Ex: Porque minha família merece ver a melhor versão de mim, porque sempre me senti inferior...",
  },
  {
    step: 3,
    emoji: "🔮",
    title: "Como você se sente quando imagina ter conquistado isso?",
    hint: "Feche os olhos por 10 segundos. Visualize. Qual é a sensação? Paz? Orgulho? Liberdade? Escreva isso.",
    placeholder:
      "Ex: Me sinto livre, tranquilo, orgulhoso, como se finalmente fui fiel a mim mesmo...",
  },
  {
    step: 4,
    emoji: "⚡",
    title: "O que te faria NUNCA desistir disso?",
    hint: "Pense no seu maior medo, na pessoa que você não quer decepcionar, ou na versão de você que você não quer ser.",
    placeholder:
      "Ex: Não quero chegar nos 60 anos arrependido. Meus filhos me olhando. O fracasso que vivi antes...",
  },
];

// ─── Modal de Descoberta do Propósito ─────────────────────────────────────────
function WhyDiscoveryModal({
  visible,
  onClose,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [synthesis, setSynthesis] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");

  function handleNext() {
    if (step >= 1 && step <= 4) {
      if (!currentAnswer.trim()) {
        Alert.alert(
          "Reflita um pouco",
          "Escreva algo antes de continuar. Não precisa ser perfeito.",
        );
        return;
      }
      const newAnswers = [...answers];
      newAnswers[step - 1] = currentAnswer.trim();
      setAnswers(newAnswers);
      if (step === 4) {
        const suggestion = `Eu me comprometo a ${newAnswers[0].toLowerCase().replace(/[.!?]$/, "")}, porque ${newAnswers[1].toLowerCase().replace(/[.!?]$/, "")}. Quando imagino isso realizado, sinto ${newAnswers[2].toLowerCase().replace(/[.!?]$/, "")}. O que me impede de desistir é: ${newAnswers[3].trim()}`;
        setSynthesis(
          suggestion.length > 300
            ? suggestion.substring(0, 300) + "..."
            : suggestion,
        );
        setStep(5);
      } else {
        setCurrentAnswer(answers[step] || "");
        setStep(step + 1);
      }
    } else if (step === 0) {
      setCurrentAnswer(answers[0] || "");
      setStep(1);
    }
  }

  function handleBack() {
    if (step === 1) setStep(0);
    else if (step > 1) {
      setCurrentAnswer(answers[step - 2] || "");
      setStep(step - 1);
    } else if (step === 5) {
      setCurrentAnswer(answers[3] || "");
      setStep(4);
    }
  }

  function handleApply() {
    if (!synthesis.trim()) {
      Alert.alert("Escreva seu propósito", "Ajuste o texto antes de salvar.");
      return;
    }
    onApply(synthesis.trim());
    handleReset();
  }

  function handleReset() {
    setStep(0);
    setAnswers(["", "", "", ""]);
    setSynthesis("");
    setCurrentAnswer("");
    onClose();
  }

  const q = step >= 1 && step <= 4 ? WHY_QUESTIONS[step - 1] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleReset}
    >
      <SafeAreaView style={w.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={w.header}>
            {step > 0 && step < 5 && (
              <TouchableOpacity onPress={handleBack} style={w.backBtn}>
                <Ionicons name="chevron-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={w.headerTitle}>
                {step === 0
                  ? "🧭 Descubra seu Propósito"
                  : step === 5
                    ? "✨ Seu Propósito"
                    : `Pergunta ${step} de 4`}
              </Text>
              {step >= 1 && step <= 4 && (
                <View style={w.progressBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        w.progressDot,
                        i <= step && { backgroundColor: COLORS.primary },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleReset}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={w.content}
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 && (
              <View style={w.introContainer}>
                <Text style={w.introEmoji}>🔍</Text>
                <Text style={w.introTitle}>Você sabe qual é o seu porquê?</Text>
                <Text style={w.introText}>
                  A maioria das pessoas define metas sem saber o real motivo por
                  trás delas. Resultado: desistem na primeira dificuldade.
                </Text>
                <Text style={w.introText}>
                  O seu <Text style={w.introBold}>Porquê Central</Text> é a
                  âncora emocional que te mantém em movimento mesmo quando tudo
                  desanima.
                </Text>
                <View style={w.introBox}>
                  <Text style={w.introBoxTitle}>📌 Como funciona:</Text>
                  <View style={w.introStep}>
                    <Text style={w.introStepNum}>1</Text>
                    <Text style={w.introStepText}>
                      Responda 4 perguntas honestas (5 min)
                    </Text>
                  </View>
                  <View style={w.introStep}>
                    <Text style={w.introStepNum}>2</Text>
                    <Text style={w.introStepText}>
                      O app sugere uma síntese do seu propósito
                    </Text>
                  </View>
                  <View style={w.introStep}>
                    <Text style={w.introStepNum}>3</Text>
                    <Text style={w.introStepText}>
                      Você ajusta com suas próprias palavras e salva
                    </Text>
                  </View>
                </View>
                <View style={w.introTip}>
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color={COLORS.warning}
                  />
                  <Text style={w.introTipText}>
                    Não existe resposta certa ou errada. Seja honesto. Ninguém
                    vai ver suas respostas — elas são só para te ajudar a chegar
                    no texto final.
                  </Text>
                </View>
                <TouchableOpacity style={w.startBtn} onPress={handleNext}>
                  <Text style={w.startBtnText}>Começar agora</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {q && step >= 1 && step <= 4 && (
              <View style={w.questionContainer}>
                <Text style={w.questionEmoji}>{q.emoji}</Text>
                <Text style={w.questionTitle}>{q.title}</Text>
                <View style={w.hintBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={COLORS.info}
                  />
                  <Text style={w.hintText}>{q.hint}</Text>
                </View>
                <TextInput
                  style={w.answerInput}
                  value={currentAnswer}
                  onChangeText={setCurrentAnswer}
                  multiline
                  autoFocus
                  placeholder={q.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  textAlignVertical="top"
                />
                {step === 1 && (
                  <View style={w.exampleBox}>
                    <Text style={w.exampleLabel}>
                      💡 Exemplos de outros usuários:
                    </Text>
                    <Text style={w.exampleItem}>
                      "Quero sair das dívidas e ter independência financeira"
                    </Text>
                    <Text style={w.exampleItem}>
                      "Quero ter energia para brincar com meus filhos"
                    </Text>
                    <Text style={w.exampleItem}>
                      "Quero construir meu próprio negócio e sair do emprego"
                    </Text>
                  </View>
                )}
                {step === 2 && (
                  <View style={w.exampleBox}>
                    <Text style={w.exampleLabel}>
                      💡 Dica — Pergunte "por quê?" 5 vezes:
                    </Text>
                    <Text style={w.exampleItem}>
                      Quero emagrecer → por quê? → ter saúde → por quê? → ver
                      meus filhos crescerem →{" "}
                      <Text
                        style={{ fontWeight: "700", color: COLORS.primary }}
                      >
                        esse é o verdadeiro porquê.
                      </Text>
                    </Text>
                  </View>
                )}
                {step === 3 && (
                  <View style={w.exampleBox}>
                    <Text style={w.exampleLabel}>
                      💡 Palavras que costumam aparecer:
                    </Text>
                    <Text style={w.exampleItem}>
                      Livre • Orgulhoso • Tranquilo • Realizado • Digno •
                      Inteiro • Em paz • Forte
                    </Text>
                  </View>
                )}
                {step === 4 && (
                  <View style={w.exampleBox}>
                    <Text style={w.exampleLabel}>
                      💡 Seu "nunca desistir" pode ser:
                    </Text>
                    <Text style={w.exampleItem}>
                      Uma pessoa (filho, pai, parceiro)
                    </Text>
                    <Text style={w.exampleItem}>
                      Uma versão passada de você que sofreu
                    </Text>
                    <Text style={w.exampleItem}>
                      Um medo específico de fracasso
                    </Text>
                    <Text style={w.exampleItem}>
                      Uma promessa que você fez a si mesmo
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={w.nextBtn} onPress={handleNext}>
                  <Text style={w.nextBtnText}>
                    {step === 4 ? "Gerar meu propósito" : "Próxima pergunta"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {step === 5 && (
              <View style={w.synthesisContainer}>
                <Text style={w.synthesisIntro}>
                  Com base nas suas respostas, geramos uma sugestão de
                  propósito.{" "}
                  <Text style={{ fontWeight: "700" }}>
                    Edite com suas próprias palavras
                  </Text>{" "}
                  até ficar perfeito para você:
                </Text>
                <TextInput
                  style={w.synthesisInput}
                  value={synthesis}
                  onChangeText={setSynthesis}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                />
                <View style={w.synthesisTip}>
                  <Ionicons
                    name="bulb-outline"
                    size={14}
                    color={COLORS.warning}
                  />
                  <Text style={w.synthesisTipText}>
                    O propósito ideal tem 1-3 frases, é pessoal, emocionalmente
                    carregado e faz você querer agir quando o lê.
                  </Text>
                </View>
                <View style={w.exampleBox}>
                  <Text style={w.exampleLabel}>
                    📖 Como grandes líderes definem o porquê:
                  </Text>
                  <Text style={w.exampleItem}>
                    <Text style={{ fontWeight: "700" }}>Steve Jobs:</Text>{" "}
                    "Colocar um computador nas mãos de pessoas comuns para mudar
                    o mundo."
                  </Text>
                  <Text style={w.exampleItem}>
                    <Text style={{ fontWeight: "700" }}>Simon Sinek:</Text>{" "}
                    "Inspirar pessoas a fazerem o que as inspira, para que
                    juntos mudemos o mundo."
                  </Text>
                  <Text style={w.exampleItem}>
                    <Text style={{ fontWeight: "700" }}>Kobe Bryant:</Text> "Ser
                    o melhor que posso ser todos os dias — sem desculpas, sem
                    limites."
                  </Text>
                </View>
                <View style={w.synthesisActions}>
                  <TouchableOpacity
                    style={w.backBtn2}
                    onPress={() => {
                      setCurrentAnswer(answers[3]);
                      setStep(4);
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={w.backBtn2Text}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={w.applyBtn} onPress={handleApply}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={w.applyBtnText}>
                      Salvar como meu propósito
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tela Principal ────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const router = useRouter();
  const { user, updateUser } = useUserStore();
  const { signOut, session } = useAuthStore();
  const { habits, routines } = useHabitStore();
  const { userXP } = useGamificationStore();
  const { tasks } = useTaskStore();
  const { objectives } = useObjectiveStore();
  const { goals: smarterGoals } = useSmarterGoalStore();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showFullResetStep, setShowFullResetStep] = useState<0 | 1 | 2>(0);

  const levelTitle = getLevelTitle(userXP?.level ?? 1);
  const currentPhase = user?.currentPhase ?? 1;

  const [editingName, setEditingName] = useState(false);
  const [editingWhy, setEditingWhy] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedPhaseDetail, setSelectedPhaseDetail] = useState<
    1 | 2 | 3 | 4 | 5 | 6 | null
  >(null);
  const [tempName, setTempName] = useState(user?.name ?? "");
  const [tempWhy, setTempWhy] = useState(user?.whyAnchor ?? "");

  // Configurações de notificação
  const [notifCheckin, setNotifCheckin] = useState(true);
  const [notifGratitude, setNotifGratitude] = useState(true);
  const [notifMomentum, setNotifMomentum] = useState(true);
  const [notifGoalReview, setNotifGoalReview] = useState(true);
  const [checkinHour, setCheckinHour] = useState("08:00");
  const [gratitudeHour, setGratitudeHour] = useState("21:30");

  // Anthropic API key (Coach IA)
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicKeyConfigured, setAnthropicKeyConfigured] = useState(false);
  const [savingAnthropicKey, setSavingAnthropicKey] = useState(false);

  useEffect(() => {
    AnthropicKeyService.isConfigured().then(setAnthropicKeyConfigured);
  }, []);

  async function handleSaveAnthropicKey() {
    if (!anthropicKey.trim()) return;
    setSavingAnthropicKey(true);
    await AnthropicKeyService.setKey(anthropicKey.trim());
    const ok = await AnthropicKeyService.isConfigured();
    setAnthropicKeyConfigured(ok);
    setSavingAnthropicKey(false);
    setAnthropicKey('');
    Alert.alert(ok ? '✅ Chave salva' : '⚠️ Chave inválida', ok
      ? 'O Coach IA e o resumo semanal já estão disponíveis.'
      : 'Verifique se a chave começa com "sk-ant".');
  }

  async function handleClearAnthropicKey() {
    await AnthropicKeyService.clearKey();
    setAnthropicKeyConfigured(false);
    Alert.alert('Chave removida', 'O Coach IA está desativado.');
  }

  // Supabase sync
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  // Verifica se Supabase já está configurado
  useEffect(() => {
    (async () => {
      const configured = await hasSupabaseCredentials();
      setSupabaseConfigured(configured);
      if (configured && user?.id) {
        const last = await getLastSyncDate(user.id);
        setLastSyncDate(last);
      }
    })();
  }, [user?.id]);

  const handleSync = useCallback(async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncData(user.id);
      setSyncResult(result);
      if (result.status === "success") {
        setLastSyncDate(result.pushedAt ?? null);
      }
      if (result.status === "not_configured") {
        Alert.alert(
          "Supabase não configurado",
          "Configure suas credenciais primeiro.",
        );
      } else if (result.status === "error") {
        Alert.alert(
          "Erro ao sincronizar",
          result.error ?? "Verifique sua conexão e tente novamente.",
        );
      } else if (result.status === "success") {
        const total = (result.tables ?? []).reduce(
          (s, t) => s + t.pushed + t.pulled,
          0,
        );
        Alert.alert("✅ Sync concluído", `${total} registros sincronizados.`);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id]);

  const handleSaveSupabaseCredentials = useCallback(async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      Alert.alert("Atenção", "Preencha a URL e a chave anon do Supabase.");
      return;
    }
    setIsSyncing(true);
    try {
      const ok = await testSupabaseConnection({
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
      });
      if (!ok) {
        Alert.alert(
          "Falha na conexão",
          "Não foi possível conectar ao Supabase. Verifique as credenciais e se o projeto está ativo.",
        );
        return;
      }
      await saveSupabaseCredentials({
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
      });
      setSupabaseConfigured(true);
      Alert.alert(
        "✅ Supabase configurado",
        "Credenciais salvas. Execute o primeiro sync quando quiser.",
      );
    } catch (e: any) {
      Alert.alert(
        "Erro",
        e?.message ?? "Não foi possível salvar as credenciais.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [supabaseUrl, supabaseKey]);

  const handleDisconnectSupabase = useCallback(() => {
    setShowDisconnectConfirm(true);
  }, []);

  const doDisconnectSupabase = useCallback(async () => {
    await clearSupabaseCredentials();
    await clearSyncHistory(user?.id);
    setSupabaseConfigured(false);
    setLastSyncDate(null);
    setSyncResult(null);
    setSupabaseUrl("");
    setSupabaseKey("");
    setShowDisconnectConfirm(false);
  }, [user?.id]);

  async function handleSaveName() {
    if (!tempName.trim()) {
      Alert.alert("Atenção", "O nome não pode ficar vazio.");
      return;
    }
    await updateUser({ name: tempName.trim() });
    setEditingName(false);
  }

  async function handleSaveWhy() {
    if (!tempWhy.trim()) {
      Alert.alert("Atenção", "O propósito não pode ficar vazio.");
      return;
    }
    await updateUser({ whyAnchor: tempWhy.trim() });
    setEditingWhy(false);
  }

  async function handleApplyDiscoveredWhy(text: string) {
    await updateUser({ whyAnchor: text });
    setTempWhy(text);
    setShowWhyModal(false);
  }

  async function handleSetPhase(phase: 1 | 2 | 3 | 4 | 5 | 6) {
    await updateUser({ currentPhase: phase });
    setShowPhaseModal(false);
  }

  async function handleResetNotifications() {
    await NotificationService.cancelAll();
    Alert.alert("✅ Notificações resetadas");
  }

  async function handleSaveNotifications() {
    await NotificationService.cancelAll();

    if (notifCheckin) {
      // 3 lembretes: manhã (8h), tarde (13h) e noite (20h)
      await CheckInNotificationManager.enable();
    } else {
      await CheckInNotificationManager.disable();
    }
    if (notifGratitude) {
      const [h, m] = gratitudeHour.split(":").map(Number);
      await NotificationService.scheduleGratitudeReminder(h, m);
    }
    if (notifMomentum) {
      await NotificationService.scheduleMomentumWarning();
    }
    if (notifGoalReview) {
      await NotificationService.scheduleWeeklyGoalReview(1, 19, 0);
    }

    // Re-agendar rotinas ativas
    for (const r of routines.filter((r) => r.isActive && r.triggerTime)) {
      await NotificationService.scheduleRoutineReminder(r);
    }

    setShowNotifModal(false);
    Alert.alert("✅ Notificações salvas", "Suas preferências foram aplicadas.");
  }

  async function handleExportData() {
    try {
      await DataExportService.exportAll();
    } catch (e: any) {
      Alert.alert("Erro ao exportar", e?.message ?? "Não foi possível exportar os dados.");
    }
  }

  async function handleResetDailyReset() {
    await AsyncStorage.removeItem("mindos_last_reset");
    Alert.alert("✅ Reset diário limpo", "Feche e reabra o app para aplicar.");
  }

  function handleFullReset() {
    setShowFullResetStep(1);
  }

  async function doFullReset() {
    setShowFullResetStep(0);
    const userId = session?.user?.id;

    // 1. Apaga todos os dados do Supabase para este usuário
    if (userId) {
      try {
        const client = await getSupabaseClient();
        if (client) {
          const userTables = [
            "habit_logs", "routine_habits", "xp_history", "missions", "rewards",
            "priming_items", "personal_metrics", "metric_entries", "sub_goals",
            "goal_checkpoints", "node_relations", "study_sessions", "study_notes",
            "finance_categories", "transactions", "agenda_events", "gratitude_entries",
            "cookie_jar", "brain_nodes", "notes", "routines", "habits",
            "user_xp", "goals", "tasks", "objectives", "smarter_goals",
            "study_subjects", "finance_accounts",
          ];
          for (const table of userTables) {
            await client.from(table).delete().eq("user_id", userId);
          }
          // Apaga o próprio registro do usuário por último
          await client.from("users").delete().eq("id", userId);
        }
      } catch {
        // continua mesmo se Supabase falhar
      }
    }

    // 2. Apaga o IndexedDB (banco principal do app web/desktop)
    if (typeof indexedDB !== "undefined") {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("mindos_idb");
        req.onsuccess = () => resolve();
        req.onerror   = () => resolve();
        req.onblocked = () => resolve();
      });
    }

    // 3. Limpa AsyncStorage + localStorage (tokens, config)
    await AsyncStorage.clear();
    if (typeof localStorage !== "undefined") {
      try { localStorage.clear(); } catch { /* ignora */ }
    }

    // 4. Faz logout e recarrega a página do zero
    try { await signOut(); } catch { /* ignora */ }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.replace("/(auth)/sign-in" as any);
    }
  }

  const phase = PHASES[currentPhase as keyof typeof PHASES];
  const xp = userXP?.totalXp ?? 0;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const activeHabits = habits.filter((h) => h.isActive).length;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <Text style={s.pageTitle}>⚙️ {t('settings.title')}</Text>

        {/* ─── IDIOMA ─── */}
        <Text style={s.sectionTitle}>{t('settings.language.title').toUpperCase()}</Text>
        <View style={s.card}>
          <Text style={s.settingLabel}>{t('settings.language.subtitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {(['pt', 'en'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  s.langBtn,
                  language === lang && s.langBtnActive,
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[s.langBtnText, language === lang && s.langBtnTextActive]}>
                  {lang === 'pt' ? '🇧🇷 Português' : '🇺🇸 English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── PERFIL ─── */}
        <Text style={s.sectionTitle}>MEU PERFIL</Text>
        <View style={s.card}>
          <View style={s.profileTop}>
            <View style={[s.avatar, { backgroundColor: phase.color }]}>
              <Text style={s.avatarLetter}>
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileLevel}>
                Nível {userXP?.level ?? 1} • {levelTitle}
              </Text>
              <Text style={s.profileXP}>
                {xp.toLocaleString("pt-BR")} XP total
              </Text>
              <View
                style={[
                  s.phaseBadge,
                  {
                    backgroundColor: phase.color + "20",
                    borderColor: phase.color + "50",
                  },
                ]}
              >
                <Text style={[s.phaseBadgeText, { color: phase.color }]}>
                  {phase.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Nome editável */}
          <View style={s.fieldRow}>
            <View style={s.fieldLeft}>
              <Text style={s.fieldLabel}>Nome</Text>
              {editingName ? (
                <TextInput
                  style={s.fieldInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                  returnKeyType="done"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={s.fieldValue}>{user?.name ?? "—"}</Text>
              )}
            </View>
            {editingName ? (
              <View style={s.editActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingName(false);
                    setTempName(user?.name ?? "");
                  }}
                  style={s.cancelBtn}
                >
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveName} style={s.saveBtn}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setTempName(user?.name ?? "");
                  setEditingName(true);
                }}
                style={s.editBtn}
              >
                <Ionicons name="pencil" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── PROPÓSITO ─── */}
        <Text style={s.sectionTitle}>MEU PROPÓSITO</Text>
        <View style={s.card}>
          <View style={s.anchorHeader}>
            <Text style={s.anchorEmoji}>⚓</Text>
            <Text style={s.anchorLabel}>Meu porquê central</Text>
            {!editingWhy && (
              <TouchableOpacity
                onPress={() => {
                  setTempWhy(user?.whyAnchor ?? "");
                  setEditingWhy(true);
                }}
                style={s.editBtn}
              >
                <Ionicons name="pencil" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editingWhy ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <TextInput
                style={s.whyInput}
                value={tempWhy}
                onChangeText={setTempWhy}
                multiline
                autoFocus
                numberOfLines={4}
                placeholder="Ex: Quero ser um exemplo para minha família..."
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={s.whyActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingWhy(false);
                    setTempWhy(user?.whyAnchor ?? "");
                  }}
                  style={s.whyCancelBtn}
                >
                  <Text style={s.whyCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveWhy} style={s.whySaveBtn}>
                  <Text style={s.whySaveText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <Text style={s.anchorText}>
              {user?.whyAnchor ||
                "Toque no lápis para definir seu porquê central..."}
            </Text>
          )}

          {!editingWhy && (
            <TouchableOpacity
              style={s.discoverBtn}
              onPress={() => setShowWhyModal(true)}
            >
              <View style={s.discoverBtnInner}>
                <Ionicons
                  name="compass-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <View style={s.discoverBtnText}>
                  <Text style={s.discoverBtnTitle}>
                    Não sei qual é meu propósito
                  </Text>
                  <Text style={s.discoverBtnSub}>
                    Responda 4 perguntas e descubra em 5 min
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.primary}
                />
              </View>
            </TouchableOpacity>
          )}

          {!editingWhy && (
            <View style={s.anchorTip}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={COLORS.textMuted}
              />
              <Text style={s.anchorTipText}>
                Seu propósito aparece no Dashboard e é a base de toda sua
                jornada. Quanto mais honesto, mais poderoso.
              </Text>
            </View>
          )}
        </View>

        {/* ─── FASE ATUAL ─── */}
        <Text style={s.sectionTitle}>FASE DO SISTEMA</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={[s.currentPhaseRow, { borderLeftColor: phase.color }]}
            onPress={() => setShowPhaseModal(true)}
          >
            <Text style={s.currentPhaseEmoji}>
              {PHASE_DETAILS[currentPhase as keyof typeof PHASE_DETAILS].emoji}
            </Text>
            <View style={s.currentPhaseInfo}>
              <Text style={[s.currentPhaseName, { color: phase.color }]}>
                Fase {currentPhase} — {phase.name}
              </Text>
              <Text style={s.currentPhaseDesc}>{phase.description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.phaseLearnBtn}
            onPress={() => {
              setSelectedPhaseDetail(currentPhase as 1 | 2 | 3 | 4 | 5 | 6);
              setShowPhaseModal(true);
            }}
          >
            <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
            <Text style={s.phaseLearnText}>Ver o que fazer nesta fase</Text>
          </TouchableOpacity>
        </View>

        {/* ─── COACH IA / ANTHROPIC KEY ─── */}
        <Text style={s.sectionTitle}>COACH IA</Text>
        <View style={s.card}>
          <View style={s.optionRow}>
            <View style={[s.optionIcon, { backgroundColor: anthropicKeyConfigured ? `${COLORS.success}20` : `${COLORS.warning}20` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={anthropicKeyConfigured ? COLORS.success : COLORS.warning} />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={s.optionText}>API Anthropic</Text>
              <Text style={[s.optionSub, { color: anthropicKeyConfigured ? COLORS.success : COLORS.warning }]}>
                {anthropicKeyConfigured ? '✓ Configurada — Coach IA ativo' : 'Não configurada — adicione sua chave'}
              </Text>
            </View>
          </View>

          {!anthropicKeyConfigured ? (
            <View style={{ gap: 8, marginTop: 12 }}>
              <TextInput
                style={s.input}
                placeholder="sk-ant-api03-..."
                placeholderTextColor={COLORS.textMuted}
                value={anthropicKey}
                onChangeText={setAnthropicKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[s.anthropicSaveBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveAnthropicKey}
                disabled={!anthropicKey.trim() || savingAnthropicKey}
              >
                <Text style={s.saveBtnText}>
                  {savingAnthropicKey ? 'Salvando...' : 'Salvar chave'}
                </Text>
              </TouchableOpacity>
              <Text style={s.optionSub}>
                Gere sua chave em console.anthropic.com → API Keys. A chave fica armazenada localmente.
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={{ marginTop: 8 }} onPress={handleClearAnthropicKey}>
              <Text style={[s.optionSub, { color: COLORS.primary }]}>Remover chave</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── ESTATÍSTICAS ─── */}
        <Text style={s.sectionTitle}>ESTATÍSTICAS GERAIS</Text>
        <View style={s.card}>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{activeHabits}</Text>
              <Text style={s.statLabel}>Hábitos ativos</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{routines.length}</Text>
              <Text style={s.statLabel}>Rotinas</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{objectives.length}</Text>
              <Text style={s.statLabel}>Objetivos</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{smarterGoals.length}</Text>
              <Text style={s.statLabel}>Metas</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{completedTasks}</Text>
              <Text style={s.statLabel}>Tarefas feitas</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{userXP?.longestStreak ?? 0}d</Text>
              <Text style={s.statLabel}>Maior streak</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: COLORS.primary }]}>
                {xp.toLocaleString("pt-BR")}
              </Text>
              <Text style={s.statLabel}>XP total</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: COLORS.celebrate }]}>
                Nv.{userXP?.level ?? 1}
              </Text>
              <Text style={s.statLabel}>Nível</Text>
            </View>
          </View>
        </View>

        {/* ─── NOTIFICAÇÕES ─── */}
        <Text style={s.sectionTitle}>NOTIFICAÇÕES</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.optionRow}
            onPress={() => setShowNotifModal(true)}
          >
            <View
              style={[s.optionIcon, { backgroundColor: COLORS.info + "20" }]}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={COLORS.info}
              />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={s.optionText}>Configurar notificações</Text>
              <Text style={s.optionSub}>
                Check-in, gratidão, momentum, revisão
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity
            style={s.optionRow}
            onPress={handleResetNotifications}
          >
            <View
              style={[s.optionIcon, { backgroundColor: COLORS.warning + "20" }]}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={COLORS.warning}
              />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={s.optionText}>Resetar notificações</Text>
              <Text style={s.optionSub}>
                Cancela todas as notificações agendadas
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ─── DADOS ─── */}
        <Text style={s.sectionTitle}>DADOS & BACKUP</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.optionRow} onPress={handleExportData}>
            <View
              style={[s.optionIcon, { backgroundColor: COLORS.success + "20" }]}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color={COLORS.success}
              />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={s.optionText}>Exportar resumo</Text>
              <Text style={s.optionSub}>Salva um snapshot dos seus dados</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.optionRow} onPress={handleResetDailyReset}>
            <View
              style={[s.optionIcon, { backgroundColor: COLORS.primary + "20" }]}
            >
              <Ionicons name="timer-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={s.optionText}>Forçar reset diário</Text>
              <Text style={s.optionSub}>
                Limpa o cache para forçar reset no próximo acesso
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ─── SUPABASE SYNC ─── */}
        <Text style={s.sectionTitle}>SUPABASE SYNC</Text>
        <View style={s.card}>
          {/* Status badge */}
          <View style={s.syncStatusRow}>
            <View
              style={[
                s.syncDot,
                {
                  backgroundColor: supabaseConfigured
                    ? COLORS.success
                    : COLORS.textMuted,
                },
              ]}
            />
            <Text style={s.syncStatusText}>
              {supabaseConfigured ? "Conectado" : "Não configurado"}
            </Text>
            {lastSyncDate && (
              <Text style={s.syncLastText}>
                Último sync:{" "}
                {new Date(lastSyncDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>

          {supabaseConfigured ? (
            <>
              <TouchableOpacity
                style={[s.syncBtn, isSyncing && { opacity: 0.7 }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="sync-outline" size={18} color="#fff" />
                )}
                <Text style={s.syncBtnText}>
                  {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
                </Text>
              </TouchableOpacity>

              {syncResult?.tables && syncResult.tables.length > 0 && (
                <View style={s.syncResultBox}>
                  <Text style={s.syncResultTitle}>📊 Último resultado:</Text>
                  {syncResult.tables.map((t) => (
                    <Text key={t.name} style={s.syncResultItem}>
                      {t.name}: ↑{t.pushed} ↓{t.pulled}
                    </Text>
                  ))}
                </View>
              )}

              <View style={s.divider} />

              <TouchableOpacity
                style={s.optionRow}
                onPress={() => setShowSyncModal(true)}
              >
                <View
                  style={[
                    s.optionIcon,
                    { backgroundColor: COLORS.info + "20" },
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={COLORS.info}
                  />
                </View>
                <View style={s.optionTextBlock}>
                  <Text style={s.optionText}>Gerenciar conexão</Text>
                  <Text style={s.optionSub}>
                    Alterar credenciais ou desconectar
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={s.optionRow}
              onPress={() => setShowSyncModal(true)}
            >
              <View
                style={[s.optionIcon, { backgroundColor: COLORS.info + "20" }]}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color={COLORS.info}
                />
              </View>
              <View style={s.optionTextBlock}>
                <Text style={s.optionText}>Configurar backup na nuvem</Text>
                <Text style={s.optionSub}>
                  Conecte seu Supabase para sincronizar
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── CONTA ─── */}
        <Text style={s.sectionTitle}>CONTA</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.optionRow}
            onPress={() => setShowSignOutConfirm(true)}
          >
            <View style={[s.optionIcon, { backgroundColor: COLORS.error + "20" }]}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={[s.optionText, { color: COLORS.error }]}>
                Sair da conta
              </Text>
              <Text style={s.optionSub}>
                Encerra a sessão. Seus dados são mantidos.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* ─── ZONA DE PERIGO ─── */}
        <Text style={s.sectionTitle}>ZONA DE PERIGO</Text>
        <View style={[s.card, s.dangerCard]}>
          <TouchableOpacity
            style={s.optionRow}
            onPress={() => setShowDangerModal(true)}
          >
            <View
              style={[s.optionIcon, { backgroundColor: COLORS.error + "20" }]}
            >
              <Ionicons name="warning-outline" size={18} color={COLORS.error} />
            </View>
            <View style={s.optionTextBlock}>
              <Text style={[s.optionText, { color: COLORS.error }]}>
                Apagar todos os dados
              </Text>
              <Text style={s.optionSub}>
                Reseta o app completamente. Irreversível.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={s.about}>
          <Text style={s.aboutText}>MindOS v2.0</Text>
          <Text style={s.aboutSubtext}>
            Sistema de Disciplina Mental • 6 fases • 15 ferramentas
          </Text>
        </View>
      </ScrollView>

      {/* ─── MODAL FASES ─── */}
      <Modal
        visible={showPhaseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhaseModal(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Fases do Sistema</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPhaseModal(false);
                setSelectedPhaseDetail(null);
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {([1, 2, 3, 4, 5, 6] as const).map((p) => {
              const pd = PHASE_DETAILS[p];
              const unlocked = p <= currentPhase;
              const isCurrent = p === currentPhase;
              const isSelected = selectedPhaseDetail === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    s.phaseCard,
                    isCurrent && { borderColor: pd.color, borderWidth: 2 },
                    !unlocked && s.phaseCardLocked,
                  ]}
                  onPress={() => setSelectedPhaseDetail(isSelected ? null : p)}
                  activeOpacity={0.85}
                >
                  <View style={s.phaseCardHeader}>
                    <View
                      style={[
                        s.phaseCircle,
                        {
                          backgroundColor: unlocked ? pd.color : COLORS.border,
                        },
                      ]}
                    >
                      <Text style={s.phaseCircleText}>
                        {unlocked ? pd.emoji : "🔒"}
                      </Text>
                    </View>
                    <View style={s.phaseCardInfo}>
                      <Text
                        style={[
                          s.phaseCardName,
                          !unlocked && { color: COLORS.textMuted },
                        ]}
                      >
                        Fase {p} — {pd.name}
                      </Text>
                      <Text style={s.phaseCardSub}>{pd.subtitle}</Text>
                      {!unlocked && (
                        <Text style={s.phaseCardUnlock}>
                          🔓 {pd.howToUnlock}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={isSelected ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </View>
                  {isSelected && (
                    <View style={s.phaseDetail}>
                      <Text style={s.phaseDetailDesc}>{pd.description}</Text>
                      <Text style={s.phaseToolsTitle}>
                        🛠️ Ferramentas desta fase:
                      </Text>
                      {pd.tools.map((tool, i) => (
                        <View key={i} style={s.phaseToolRow}>
                          <View
                            style={[
                              s.phaseToolDot,
                              {
                                backgroundColor: unlocked
                                  ? pd.color
                                  : COLORS.border,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              s.phaseToolText,
                              !unlocked && { color: COLORS.textMuted },
                            ]}
                          >
                            {tool}
                          </Text>
                        </View>
                      ))}
                      {unlocked && !isCurrent && (
                        <TouchableOpacity
                          style={[s.setPhaseBtn, { backgroundColor: pd.color }]}
                          onPress={() => handleSetPhase(p)}
                        >
                          <Text style={s.setPhaseText}>
                            Mudar para esta fase
                          </Text>
                        </TouchableOpacity>
                      )}
                      {isCurrent && (
                        <View
                          style={[
                            s.currentPhasePill,
                            { backgroundColor: pd.color + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              s.currentPhasePillText,
                              { color: pd.color },
                            ]}
                          >
                            ✓ Fase atual
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL NOTIFICAÇÕES ─── */}
      <Modal
        visible={showNotifModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>🔔 Notificações</Text>
            <TouchableOpacity onPress={() => setShowNotifModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.notifSection}>DIÁRIAS</Text>

            <View style={s.notifCard}>
              <View style={s.notifRow}>
                <View style={s.notifInfo}>
                  <Text style={s.notifTitle}>🌅 Check-in matinal</Text>
                  <Text style={s.notifDesc}>
                    Lembrete para abrir o MindOS e definir a intenção do dia
                  </Text>
                </View>
                <Switch
                  value={notifCheckin}
                  onValueChange={setNotifCheckin}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary + "80",
                  }}
                  thumbColor={notifCheckin ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              {notifCheckin && (
                <View style={s.notifTimeRow}>
                  <Text style={s.notifTimeLabel}>Horário:</Text>
                  <TextInput
                    style={s.notifTimeInput}
                    value={checkinHour}
                    onChangeText={setCheckinHour}
                    placeholder="08:00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              )}
            </View>

            <View style={s.notifCard}>
              <View style={s.notifRow}>
                <View style={s.notifInfo}>
                  <Text style={s.notifTitle}>🙏 Gratidão noturna</Text>
                  <Text style={s.notifDesc}>
                    Lembrete para registrar sua gratidão do dia
                  </Text>
                </View>
                <Switch
                  value={notifGratitude}
                  onValueChange={setNotifGratitude}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary + "80",
                  }}
                  thumbColor={
                    notifGratitude ? COLORS.primary : COLORS.textMuted
                  }
                />
              </View>
              {notifGratitude && (
                <View style={s.notifTimeRow}>
                  <Text style={s.notifTimeLabel}>Horário:</Text>
                  <TextInput
                    style={s.notifTimeInput}
                    value={gratitudeHour}
                    onChangeText={setGratitudeHour}
                    placeholder="21:30"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              )}
            </View>

            <View style={s.notifCard}>
              <View style={s.notifRow}>
                <View style={s.notifInfo}>
                  <Text style={s.notifTitle}>⚡ Aviso de Momentum</Text>
                  <Text style={s.notifDesc}>
                    Alerta às 20h quando você ainda não completou hábitos
                  </Text>
                </View>
                <Switch
                  value={notifMomentum}
                  onValueChange={setNotifMomentum}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary + "80",
                  }}
                  thumbColor={notifMomentum ? COLORS.primary : COLORS.textMuted}
                />
              </View>
            </View>

            <Text style={[s.notifSection, { marginTop: 16 }]}>SEMANAIS</Text>

            <View style={s.notifCard}>
              <View style={s.notifRow}>
                <View style={s.notifInfo}>
                  <Text style={s.notifTitle}>🎯 Revisão de metas</Text>
                  <Text style={s.notifDesc}>
                    Toda segunda-feira às 19h para revisar o progresso das metas
                  </Text>
                </View>
                <Switch
                  value={notifGoalReview}
                  onValueChange={setNotifGoalReview}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary + "80",
                  }}
                  thumbColor={
                    notifGoalReview ? COLORS.primary : COLORS.textMuted
                  }
                />
              </View>
            </View>

            <View style={s.notifTip}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={COLORS.info}
              />
              <Text style={s.notifTipText}>
                As notificações de rotinas são configuradas individualmente em
                cada rotina. As de streak são automáticas quando você tem 3+
                dias consecutivos.
              </Text>
            </View>

            <TouchableOpacity
              style={s.saveNotifBtn}
              onPress={handleSaveNotifications}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={s.saveNotifText}>Salvar preferências</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL SUPABASE SYNC ─── */}
      <Modal
        visible={showSyncModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSyncModal(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>☁️ Supabase Sync</Text>
            <TouchableOpacity
              onPress={() => {
                setShowSyncModal(false);
                setShowSchema(false);
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={s.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.syncInfoCard}>
                <Text style={s.syncInfoTitle}>Como funciona</Text>
                <Text style={s.syncInfoText}>
                  O MindOS usa o Supabase como backend opcional de backup. Seus
                  dados ficam no SQLite local — o Supabase é apenas uma cópia na
                  nuvem. O sync é sempre manual.
                </Text>
                <View style={s.syncSteps}>
                  <Text style={s.syncStep}>
                    1. Crie um projeto gratuito em supabase.com
                  </Text>
                  <Text style={s.syncStep}>
                    2. Execute o schema SQL no editor do Supabase
                  </Text>
                  <Text style={s.syncStep}>
                    3. Cole a URL e chave anon abaixo
                  </Text>
                  <Text style={s.syncStep}>
                    4. Clique em Sincronizar quando quiser fazer backup
                  </Text>
                </View>
              </View>

              {/* Toggle schema SQL */}
              <TouchableOpacity
                style={s.schemaToggle}
                onPress={() => setShowSchema((v) => !v)}
              >
                <Ionicons
                  name="code-slash-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={s.schemaToggleText}>
                  {showSchema ? "Ocultar" : "Ver"} SQL do schema
                </Text>
                <Ionicons
                  name={showSchema ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {showSchema && (
                <View style={s.schemaBox}>
                  <Text style={s.schemaText} selectable>
                    {getSupabaseSchema()}
                  </Text>
                </View>
              )}

              <Text style={s.syncFieldLabel}>URL do projeto Supabase</Text>
              <TextInput
                style={s.syncInput}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://xxxx.supabase.co"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={s.syncFieldLabel}>Chave anon (public)</Text>
              <TextInput
                style={s.syncInput}
                value={supabaseKey}
                onChangeText={setSupabaseKey}
                placeholder="eyJhbGc..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                secureTextEntry
              />

              <TouchableOpacity
                style={[s.syncSaveBtn, isSyncing && { opacity: 0.7 }]}
                onPress={handleSaveSupabaseCredentials}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={s.syncSaveBtnText}>Salvar e testar conexão</Text>
              </TouchableOpacity>

              {supabaseConfigured && (
                <>
                  <View style={s.divider} />
                  <TouchableOpacity
                    style={s.syncDisconnectBtn}
                    onPress={handleDisconnectSupabase}
                  >
                    <Ionicons
                      name="cloud-offline-outline"
                      size={18}
                      color={COLORS.error}
                    />
                    <Text style={s.syncDisconnectText}>
                      Desconectar Supabase
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.syncSecurityNote}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={COLORS.textMuted}
                />
                <Text style={s.syncSecurityText}>
                  Suas credenciais ficam armazenadas apenas no seu dispositivo
                  (AsyncStorage local). Nunca são enviadas para terceiros.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL: Confirmar Sair ─── */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>Sair da conta?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Você será desconectado. Seus dados locais serão mantidos.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.actionCancelBtn, { flex: 1 }]}
                onPress={() => setShowSignOutConfirm(false)}
              >
                <Text style={s.actionCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionConfirmBtn, { flex: 1 }]}
                onPress={async () => {
                  setShowSignOutConfirm(false);
                  await signOut();
                  router.replace('/(auth)/sign-in' as any);
                }}
              >
                <Text style={s.actionConfirmText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL ZONA DE PERIGO ─── */}
      <Modal
        visible={showDangerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDangerModal(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: COLORS.error }]}>
              ⚠️ Zona de Perigo
            </Text>
            <TouchableOpacity onPress={() => setShowDangerModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View
              style={[s.dangerInfoCard, { borderColor: COLORS.error + "40" }]}
            >
              <Text style={s.dangerInfoTitle}>⚠️ Atenção</Text>
              <Text style={s.dangerInfoText}>
                As ações abaixo são irreversíveis. Não é possível recuperar
                dados apagados. Use com extremo cuidado.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.dangerBtn, { borderColor: COLORS.error }]}
              onPress={handleFullReset}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <View style={{ flex: 1 }}>
                <Text style={[s.dangerBtnTitle, { color: COLORS.error }]}>
                  Apagar todos os dados
                </Text>
                <Text style={s.dangerBtnSub}>
                  Remove hábitos, metas, finanças, XP, histórico e configurações
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.dangerBtn, { borderColor: COLORS.warning }]}
              onPress={() => {
                setShowDangerModal(false);
                setTimeout(() => handleResetNotifications(), 300);
              }}
            >
              <Ionicons
                name="notifications-off-outline"
                size={20}
                color={COLORS.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.dangerBtnTitle, { color: COLORS.warning }]}>
                  Cancelar todas as notificações
                </Text>
                <Text style={s.dangerBtnSub}>
                  Remove todas as notificações agendadas do sistema
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.warning}
              />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL DESCOBERTA DO PROPÓSITO ─── */}
      <WhyDiscoveryModal
        visible={showWhyModal}
        onClose={() => setShowWhyModal(false)}
        onApply={handleApplyDiscoveredWhy}
      />

      {/* ─── MODAL: Confirmar desconexão Supabase ─── */}
      <Modal visible={showDisconnectConfirm} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>Desconectar Supabase?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Seus dados locais não serão afetados. O histórico de sync será limpo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.actionCancelBtn, { flex: 1 }]}
                onPress={() => setShowDisconnectConfirm(false)}
              >
                <Text style={s.actionCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionConfirmBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={doDisconnectSupabase}
              >
                <Text style={s.actionConfirmText}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Apagar todos os dados — Etapa 1 ─── */}
      <Modal visible={showFullResetStep === 1} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={[s.actionSheetTitle, { color: COLORS.error }]}>⚠️ Apagar todos os dados</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>
              Isso vai apagar TODO o progresso, hábitos, metas, finanças e histórico.{'\n'}Ação IRREVERSÍVEL.{'\n\n'}Tem certeza absoluta?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.actionCancelBtn, { flex: 1 }]}
                onPress={() => setShowFullResetStep(0)}
              >
                <Text style={s.actionCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionConfirmBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => setShowFullResetStep(2)}
              >
                <Text style={s.actionConfirmText}>Apagar tudo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Apagar todos os dados — Etapa 2 (confirmação final) ─── */}
      <Modal visible={showFullResetStep === 2} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={[s.actionSheetTitle, { color: COLORS.error }]}>Última confirmação</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Esta ação não pode ser desfeita. Toque em "Confirmar apagamento" para continuar.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.actionCancelBtn, { flex: 1 }]}
                onPress={() => setShowFullResetStep(0)}
              >
                <Text style={s.actionCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionConfirmBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={doFullReset}
              >
                <Text style={[s.actionConfirmText, { fontSize: 12 }]}>Confirmar apagamento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos da tela principal ────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },
  settingLabel: { fontSize: 13, color: COLORS.textSecondary },
  langBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  langBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  langBtnTextActive: { color: COLORS.primary },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerCard: { borderWidth: 1, borderColor: COLORS.error + "30" },
  // ── Sign-out modal ─────────────────────────────────────────────────────────
  actionOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  actionSheet: {
    width: '100%', maxWidth: 440, backgroundColor: COLORS.surface,
    borderRadius: 20, padding: 20, gap: 4,
  },
  actionSheetTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    paddingBottom: 4, marginBottom: 4,
  },
  actionCancelBtn: {
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
  },
  actionCancelText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  actionConfirmBtn: {
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.error, alignItems: 'center',
  },
  actionConfirmText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 28, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1, gap: 4 },
  profileLevel: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  profileXP: { fontSize: 12, color: COLORS.textSecondary },
  phaseBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  phaseBadgeText: { fontSize: 11, fontWeight: "700" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldLeft: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValue: { fontSize: 16, color: COLORS.text, fontWeight: "500" },
  fieldInput: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  editActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  anchorHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  anchorEmoji: { fontSize: 18 },
  anchorLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: COLORS.text },
  anchorText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    fontStyle: "italic",
  },
  whyInput: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  whyActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  whyCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  whyCancelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  whySaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  whySaveText: { fontSize: 14, color: "#fff", fontWeight: "700" },
  discoverBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "40",
    backgroundColor: COLORS.primary + "08",
    overflow: "hidden",
  },
  discoverBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  discoverBtnText: { flex: 1 },
  discoverBtnTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  discoverBtnSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  anchorTip: { flexDirection: "row", alignItems: "center", gap: 6 },
  anchorTipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  currentPhaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  currentPhaseEmoji: { fontSize: 28 },
  currentPhaseInfo: { flex: 1 },
  currentPhaseName: { fontSize: 15, fontWeight: "700" },
  currentPhaseDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phaseLearnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  phaseLearnText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statItem: { width: "22%", alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextBlock: { flex: 1 },
  optionText: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  optionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10, padding: 12,
    color: COLORS.text, fontSize: 13,
    borderWidth: 1, borderColor: COLORS.border,
  },
  anthropicSaveBtn: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  divider: { height: 1, backgroundColor: COLORS.border },
  about: { alignItems: "center", marginTop: 32 },
  aboutText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  aboutSubtext: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  modalContent: { padding: 16, paddingBottom: 40, gap: 10 },
  phaseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phaseCardLocked: { opacity: 0.6 },
  phaseCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  phaseCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseCircleText: { fontSize: 22 },
  phaseCardInfo: { flex: 1 },
  phaseCardName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  phaseCardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phaseCardUnlock: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 4,
    fontWeight: "600",
  },
  phaseDetail: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  phaseDetailDesc: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  phaseToolsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  phaseToolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  phaseToolDot: { width: 6, height: 6, borderRadius: 3 },
  phaseToolText: { fontSize: 13, color: COLORS.text },
  setPhaseBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  setPhaseText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  currentPhasePill: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  currentPhasePillText: { fontSize: 14, fontWeight: "700" },
  // Notificações
  notifSection: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  notifCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  notifDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  notifTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notifTimeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  notifTimeInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "700",
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
  },
  notifTip: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.info + "12",
    borderRadius: 10,
    padding: 12,
  },
  notifTipText: { fontSize: 12, color: COLORS.text, lineHeight: 18, flex: 1 },
  saveNotifBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveNotifText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  // Supabase sync
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncStatusText: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  syncLastText: { fontSize: 11, color: COLORS.textMuted, marginLeft: "auto" },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.info,
    borderRadius: 12,
    paddingVertical: 12,
  },
  syncBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  syncResultBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  syncResultTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  syncResultItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  syncInfoCard: {
    backgroundColor: COLORS.info + "10",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.info + "30",
    gap: 8,
  },
  syncInfoTitle: { fontSize: 14, fontWeight: "700", color: COLORS.info },
  syncInfoText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  syncSteps: { gap: 4 },
  syncStep: { fontSize: 12, color: COLORS.textSecondary, paddingLeft: 8 },
  schemaToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  schemaToggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  schemaBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    maxHeight: 200,
  },
  schemaText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 16,
  },
  syncFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  syncInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  syncSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  syncSaveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  syncDisconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  syncDisconnectText: { fontSize: 14, fontWeight: "600", color: COLORS.error },
  syncSecurityNote: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
  },
  syncSecurityText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  // Zona de perigo
  dangerInfoCard: {
    backgroundColor: COLORS.error + "08",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  dangerInfoTitle: { fontSize: 15, fontWeight: "800", color: COLORS.error },
  dangerInfoText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  dangerBtnTitle: { fontSize: 15, fontWeight: "700" },
  dangerBtnSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});

// ─── Estilos do Wizard de Propósito ──────────────────────────────────────────
const w = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  progressBar: { flexDirection: "row", gap: 6, marginTop: 6 },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  content: { padding: 24, paddingBottom: 60 },
  introContainer: { gap: 16 },
  introEmoji: { fontSize: 48, textAlign: "center" },
  introTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  introText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: "center",
  },
  introBold: { fontWeight: "800", color: COLORS.text },
  introBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  introBoxTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  introStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  introStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  introStepText: { fontSize: 14, color: COLORS.text, flex: 1 },
  introTip: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.warning + "15",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.warning + "30",
  },
  introTipText: { fontSize: 13, color: COLORS.text, lineHeight: 20, flex: 1 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  questionContainer: { gap: 18 },
  questionEmoji: { fontSize: 48, textAlign: "center" },
  questionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 28,
  },
  hintBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.info + "12",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.info + "25",
  },
  hintText: { fontSize: 13, color: COLORS.text, lineHeight: 20, flex: 1 },
  answerInput: {
    minHeight: 120,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: "top",
    backgroundColor: COLORS.surface,
  },
  exampleBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  exampleItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  synthesisContainer: { gap: 16 },
  synthesisIntro: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: "center",
  },
  synthesisInput: {
    minHeight: 160,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: "top",
    backgroundColor: COLORS.surface,
  },
  synthesisTip: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.warning + "15",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + "30",
  },
  synthesisTipText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    flex: 1,
  },
  synthesisActions: { flexDirection: "row", gap: 10 },
  backBtn2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  backBtn2Text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  applyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
