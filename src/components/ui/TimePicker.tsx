import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { COLORS } from '../../utils/constants';

interface TimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (time: string) => void;
  placeholder?: string;
}

export function TimePicker({ value, onChange, placeholder = 'Selecionar horário' }: TimePickerProps) {
  const [visible, setVisible] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const [selH, setSelH] = useState(value ? value.split(':')[0] : '08');
  const [selM, setSelM] = useState(value ? value.split(':')[1] : '00');

  const handleConfirm = () => {
    onChange(`${selH}:${selM}`);
    setVisible(false);
  };

  const handleClear = () => {
    onChange('');
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={tp.trigger} onPress={() => setVisible(true)}>
        <Text style={[tp.triggerText, !value && tp.placeholder]}>
          {value || placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={tp.clear}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={tp.icon}>🕐</Text>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={tp.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={tp.picker}>
            <Text style={tp.pickerTitle}>Selecionar Horário</Text>
            <View style={tp.columns}>
              {/* Horas */}
              <View style={tp.columnWrap}>
                <Text style={tp.colLabel}>Hora</Text>
                <ScrollView style={tp.column} showsVerticalScrollIndicator={false}>
                  {hours.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[tp.colItem, selH === h && tp.colItemSelected]}
                      onPress={() => setSelH(h)}
                    >
                      <Text style={[tp.colItemText, selH === h && tp.colItemTextSelected]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={tp.colon}>:</Text>

              {/* Minutos */}
              <View style={tp.columnWrap}>
                <Text style={tp.colLabel}>Min</Text>
                <ScrollView style={tp.column} showsVerticalScrollIndicator={false}>
                  {minutes.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[tp.colItem, selM === m && tp.colItemSelected]}
                      onPress={() => setSelM(m)}
                    >
                      <Text style={[tp.colItemText, selM === m && tp.colItemTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={tp.actions}>
              <TouchableOpacity style={tp.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={tp.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tp.confirmBtn} onPress={handleConfirm}>
                <Text style={tp.confirmText}>Confirmar {selH}:{selM}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const tp = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  triggerText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  placeholder: { color: COLORS.textMuted },
  clear: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700' },
  icon: { fontSize: 16 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  picker: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
    width: 300, gap: 16,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  columns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  columnWrap: { flex: 1, alignItems: 'center', gap: 6 },
  colLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  column: { height: 200 },
  colItem: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center',
  },
  colItemSelected: { backgroundColor: COLORS.primary },
  colItemText: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  colItemTextSelected: { color: '#fff' },
  colon: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 2, padding: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
