import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../src/utils/constants';
import { Button } from '../../src/components/ui/Button';

export default function WhyAnchorScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [why, setWhy] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (!why.trim()) return;
    router.push({
      pathname: '/(onboarding)/routine-setup',
      params: { name, why: why.trim(), imageUri: imageUri ?? '' },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepActive]} />
          <View style={styles.step} />
          <View style={styles.step} />
        </View>

        <Text style={styles.greeting}>Olá, {name}! 👋</Text>
        <Text style={styles.title}>Defina sua Âncora</Text>
        <Text style={styles.subtitle}>
          O "Porquê" é o que te faz levantar quando tudo quer te derrubar.
          Seja honesto e específico.
        </Text>

        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>Exemplos reais:</Text>
          <Text style={styles.example}>"Cansei de estar sem dinheiro aos 30 anos"</Text>
          <Text style={styles.example}>"Quero ser um exemplo para meu filho"</Text>
          <Text style={styles.example}>"Não aceito mais ser medíocre"</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Seu porquê real (seja brutal):</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Escreva sem filtro..."
            placeholderTextColor={COLORS.textSecondary}
            value={why}
            onChangeText={setWhy}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.imageSection}>
          <Text style={styles.label}>Foto do seu objetivo (opcional):</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>🖼️</Text>
                <Text style={styles.imagePlaceholderText}>Adicionar foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Button
          title="Próximo: Criar Rotina →"
          onPress={handleNext}
          disabled={!why.trim()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, padding: 24 },
  stepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  step: { height: 4, flex: 1, backgroundColor: COLORS.border, borderRadius: 2 },
  stepDone: { backgroundColor: COLORS.primary },
  stepActive: { backgroundColor: COLORS.primary + '80' },
  greeting: { fontSize: 20, color: COLORS.textSecondary, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  exampleBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  exampleLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  example: { color: COLORS.text, fontSize: 14, marginBottom: 4, lineHeight: 20 },
  form: { marginBottom: 20 },
  label: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 10 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textarea: { minHeight: 120 },
  imageSection: { marginBottom: 24 },
  imagePicker: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderIcon: { fontSize: 32, marginBottom: 8 },
  imagePlaceholderText: { color: COLORS.textSecondary, fontSize: 14 },
});
