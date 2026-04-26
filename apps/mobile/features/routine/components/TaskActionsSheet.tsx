import { Modal, Pressable, Text, View } from 'react-native';

import {
  TIME_SLOTS,
  TIME_SLOT_ICONS,
  TIME_SLOT_LABELS,
  type TimeSlot,
} from '@beproud/validation';
import type { RoutineTaskWithCatalog } from '@beproud/api';

type Props = {
  rt: RoutineTaskWithCatalog | null;
  onClose: () => void;
  onComplete: () => void;
  onMoveSlot: (slot: TimeSlot) => void;
  onRemove: () => void;
};

export default function TaskActionsSheet({
  rt, onClose, onComplete, onMoveSlot, onRemove,
}: Props) {
  return (
    <Modal
      visible={!!rt}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        onPress={onClose}
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl border-t border-brand-700 bg-brand-800 px-6 pb-8 pt-4"
        >
          <View className="mb-3 self-center h-1 w-10 rounded-full bg-brand-600" />
          {rt && (
            <>
              <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">
                {rt.task.title}
              </Text>
              <Text className="mb-3 text-[10px] text-brand-400">
                Bloque actual: {TIME_SLOT_LABELS[rt.time_slot]}
              </Text>

              <Action
                label="Completar tarea"
                emoji="✅"
                onPress={() => { onClose(); onComplete(); }}
              />

              <Text className="mt-3 mb-2 text-[10px] uppercase tracking-wider text-brand-300">
                Mover a
              </Text>
              {TIME_SLOTS.filter((s) => s !== rt.time_slot).map((s) => (
                <Action
                  key={s}
                  label={TIME_SLOT_LABELS[s]}
                  emoji={TIME_SLOT_ICONS[s]}
                  onPress={() => { onClose(); onMoveSlot(s); }}
                />
              ))}

              <View className="mt-3" />
              <Action
                label="Quitar de la rutina"
                emoji="🗑"
                destructive
                onPress={() => { onClose(); onRemove(); }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={onClose}
                className="mt-2 rounded-xl px-4 py-3"
              >
                <Text className="text-center text-base font-bold text-brand-200">
                  Cancelar
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Action({
  label, emoji, onPress, destructive,
}: {
  label: string; emoji: string; onPress: () => void; destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`mb-1.5 flex-row items-center rounded-xl px-4 py-3 ${
        destructive ? 'bg-red-500/15 active:bg-red-500/30' : 'bg-brand-700/60 active:bg-brand-600/60'
      }`}
    >
      <Text className="mr-3 text-xl">{emoji}</Text>
      <Text
        className={`flex-1 text-base font-bold ${
          destructive ? 'text-red-200' : 'text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
