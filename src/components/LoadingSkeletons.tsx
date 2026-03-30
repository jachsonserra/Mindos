/**
 * Loading Skeletons — Componentes para exibir durante carregamento
 *
 * CORREÇÕES aplicadas nesta versão:
 *
 * 1. SHIMMER ANIMATION adicionada ao SkeletonBar:
 *    Antes: bloco de cor sólida estático — parece UI travada.
 *    Agora:  animação de brilho que percorre o bloco da esquerda para direita.
 *    Técnica: Animated.loop + translateX de -largura até +largura,
 *    com um gradiente branco semitransparente passando por cima.
 *
 * 2. ÍCONE DE ERRO adicionado ao ErrorScreen:
 *    Antes: círculo rosa vazio com comentário TODO.
 *    Agora:  "⚠" (Unicode warning sign) renderizado como Text dentro do círculo.
 *    Não usa Ionicons para evitar dependência de expo-vector-icons aqui.
 *
 * O QUE É Animated DO REACT NATIVE?
 * Animated é a API nativa de animações do React Native.
 * Em vez de re-renderizar o componente a cada frame (caro),
 * ela move o trabalho para a thread de UI nativa.
 * Animated.Value é um valor especial que pode ser interpolado.
 * Animated.loop repete uma animação indefinidamente.
 * useNativeDriver: true = roda na thread nativa (60fps garantido).
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { COLORS } from "../utils/constants";

/**
 * Barra de skeleton com animação shimmer (brilho deslizante).
 *
 * Como o shimmer funciona:
 * 1. Criamos um Animated.Value começando em 0.
 * 2. Animamos esse valor de 0 → 1 em 1200ms, repetindo infinitamente.
 * 3. Interpolamos o valor para translateX: de -width até +width.
 * 4. Aplicamos o translateX em uma View branca semitransparente por cima.
 * Efeito visual: uma faixa brilhante desliza da esquerda para a direita.
 */
export const SkeletonBar: React.FC<{
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: object;
}> = ({ width = "100%", height = 20, borderRadius = 8, style }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animated.Value é o "controle deslizante" da animação.
  // Começa em 0, vai para 1 e repete — o número em si não importa,
  // só usamos como base para interpolação.
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animated.loop() repete a animação indefinidamente.
    // Animated.timing() define o movimento linear de 0 → 1 em 1200ms.
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,        // Valor final de cada ciclo.
        duration: 1200,    // Duração de um ciclo completo em milissegundos.
        useNativeDriver: true, // Roda na thread de UI nativa — mais performático.
        // Com useNativeDriver: true, só podemos animar: opacity, transform.
        // NÃO podemos animar: backgroundColor, width, height diretamente.
      })
    );

    animation.start(); // Inicia a animação.

    // Cleanup: para a animação quando o componente for desmontado.
    // Sem isso, memory leak — animação continua rodando em background.
    return () => animation.stop();
  }, []); // Sem dependências — roda só na montagem e limpa na desmontagem.

  // Interpolação: converte o valor 0-1 em pixels de translateX.
  // O brilho começa "escondido" à esquerda (-300) e termina à direita (+300).
  // O valor 300 é grande o suficiente para cobrir qualquer largura de tela.
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],          // Valores de entrada (nossa Animated.Value)
    outputRange: [-300, 300],    // Pixels de translateX correspondentes
  });

  // Cor base do skeleton — mais escuro no dark mode.
  const baseColor = isDark ? "#2a2a2a" : "#e0e0e0";

  // Cor do "brilho" — branco mais visível no dark, menos no light.
  const shimmerColor = isDark
    ? "rgba(255,255,255,0.07)" // Sutil no dark
    : "rgba(255,255,255,0.6)";  // Bem visível no light

  return (
    <View
      style={[
        styles.skeletonBase,
        { width, height, borderRadius, backgroundColor: baseColor },
        style,
      ]}
    >
      {/* View animada com overflow hidden no pai garante que o "brilho"
          não apareça fora dos limites do skeleton. */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: shimmerColor,
            // transform com translateX para mover horizontalmente.
            // IMPORTANTE: useNativeDriver: true só funciona com transform e opacity.
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />
    </View>
  );
};

/**
 * Skeleton para item de lista (ex: hábito, tarefa).
 * Mostra um círculo (avatar) + duas linhas de texto.
 */
export const SkeletonListItem: React.FC<{
  avatarSize?: number;
}> = ({ avatarSize = 40 }) => {
  return (
    <View style={styles.listItemContainer}>
      {/* Avatar circular */}
      <SkeletonBar
        width={avatarSize}
        height={avatarSize}
        borderRadius={avatarSize / 2}
      />
      {/* Linhas de texto — larguras diferentes simulam título e subtítulo */}
      <View style={styles.listItemContent}>
        <SkeletonBar width="60%" height={16} />
        <SkeletonBar width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

/**
 * Skeleton para card genérico.
 * Título + N linhas de conteúdo.
 */
export const SkeletonCard: React.FC<{
  lines?: number;
}> = ({ lines = 3 }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Título do card */}
      <SkeletonBar width="80%" height={20} style={{ marginBottom: 12 }} />
      {/* Linhas de conteúdo — última linha mais curta para simular fim de parágrafo */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height={12}
          style={{ marginBottom: 8 }}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton para a tela de Dashboard completa.
 * Layout espelha a estrutura real do Dashboard.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.dashboardContainer}>
      {/* Header: saudação + subtítulo */}
      <View style={styles.headerSection}>
        <SkeletonBar width="40%" height={32} />
        <SkeletonBar width="60%" height={16} style={{ marginTop: 8 }} />
      </View>

      {/* Stats: dois cards lado a lado */}
      <View style={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <SkeletonCard lines={2} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonCard lines={2} />
        </View>
      </View>

      {/* Lista: título da seção + 3 itens */}
      <View style={styles.listSection}>
        <SkeletonBar width="30%" height={24} style={{ marginBottom: 16 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </View>
    </View>
  );
};

/**
 * Skeleton para a tela de Agenda.
 */
export const AgendaSkeleton: React.FC = () => {
  return (
    <View style={styles.agendaContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.agendaEventSkeleton}>
          <SkeletonBar width={60} height={12} />
          <SkeletonBar width="70%" height={16} style={{ marginTop: 8 }} />
          <SkeletonBar width="50%" height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

/**
 * Tela de erro genérica com botão de retry.
 *
 * CORREÇÃO: ícone "⚠" adicionado — antes o círculo era vazio.
 */
export const ErrorScreen: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = "Erro ao carregar",
  message = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#fff" : "#1a1a1a";
  const tintColor = isDark ? "#4A9EFF" : "#007AFF";

  return (
    <View style={[styles.errorContainer, { backgroundColor: COLORS.background }]}>
      <View style={styles.errorContent}>

        {/* Ícone de aviso — círculo com "⚠" Unicode */}
        <View style={[styles.errorIcon, { backgroundColor: "#fee2e2" }]}>
          {/* "⚠" é o caractere Unicode U+26A0 (Warning Sign).
              Usar Text em vez de Ionicons evita dependência de expo-vector-icons. */}
          <Text style={styles.errorIconText}>⚠</Text>
        </View>

        <Text style={[styles.errorTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.errorMessage, { color: textColor }]}>{message}</Text>

        {/* Botão de retry — só renderiza se onRetry for fornecido */}
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: tintColor }]}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    overflow: "hidden", // CRUCIAL: garante que o shimmer não vaze fora do componente.
  },

  shimmer: {
    // Faixa vertical larga que "passa" pelo skeleton da esquerda para a direita.
    position: "absolute", // Flutua sobre a cor base do skeleton.
    top: 0,
    bottom: 0,
    width: 150,           // Largura da faixa de brilho — suficientemente larga.
    left: 0,
  },

  listItemContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },

  listItemContent: {
    flex: 1,
    justifyContent: "center",
  },

  cardContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },

  dashboardContainer: {
    flex: 1,
    padding: 16,
  },

  headerSection: {
    marginBottom: 24,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  listSection: {
    marginBottom: 24,
  },

  agendaContainer: {
    flex: 1,
    padding: 16,
  },

  agendaEventSkeleton: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  errorContent: {
    alignItems: "center",
    width: "100%",
  },

  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  errorIconText: {
    fontSize: 36, // Ícone grande e legível.
    lineHeight: 40,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7, // Levemente mais sutil que o título.
  },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
