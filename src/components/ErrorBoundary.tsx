/**
 * ErrorBoundary global do MindOS
 * Captura erros de renderização em qualquer tela filho e exibe
 * uma tela de recuperação amigável em vez de crashar silenciosamente.
 */

import React, { Component, type ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  /** Contexto opcional para identificar qual tela gerou o erro */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info.componentStack ?? null });
    // Em produção, integrar com Sentry ou similar aqui:
    // Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary]', this.props.context ?? 'App', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = this.state.error?.message ?? 'Erro desconhecido';

    return (
      <View style={s.container}>
        <View style={s.card}>
          <Ionicons name="warning-outline" size={48} color="#F59E0B" style={s.icon} />

          <Text style={s.title}>Algo deu errado</Text>
          <Text style={s.subtitle}>
            {this.props.context
              ? `Ocorreu um erro em "${this.props.context}".`
              : 'Ocorreu um erro inesperado no app.'}{' '}
            Tente recarregar esta tela.
          </Text>

          {isDev && (
            <ScrollView style={s.devBox} showsVerticalScrollIndicator={false}>
              <Text style={s.devTitle}>Detalhes do erro (dev only):</Text>
              <Text style={s.devText}>{errorMessage}</Text>
              {this.state.errorInfo && (
                <Text style={s.devStack}>{this.state.errorInfo}</Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={s.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1A1A1F',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A30',
  },
  icon: { marginBottom: 4 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9A9A9F',
    textAlign: 'center',
    lineHeight: 20,
  },
  devBox: {
    backgroundColor: '#0D0D0F',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    maxHeight: 200,
    marginTop: 8,
  },
  devTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  devStack: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7B61FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
