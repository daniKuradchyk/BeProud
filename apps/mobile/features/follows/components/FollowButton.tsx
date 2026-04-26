import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleFollow, type FollowStatus } from '@beproud/api';

type Props = {
  targetId: string;
  targetIsPrivate: boolean;
  followStatus: FollowStatus;
  isOwn: boolean;
  /** Claves de queries a invalidar tras un cambio (perfil del target, listas…). */
  invalidateKeys?: ReadonlyArray<readonly unknown[]>;
  /** Estilo compacto para listas. */
  compact?: boolean;
};

/**
 * Estados visibles:
 *  - "Editar perfil"  (es uno mismo)
 *  - "Seguir"         (no le sigues, target público)
 *  - "Solicitar"      (no le sigues, target privado)
 *  - "Solicitado"     (status pending — pulsar pide confirmación para cancelar)
 *  - "Siguiendo"      (status accepted — pulsar abre menú "Dejar de seguir")
 */
export default function FollowButton({
  targetId,
  targetIsPrivate,
  followStatus,
  isOwn,
  invalidateKeys = [],
  compact,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState<
    'cancel-request' | 'unfollow' | null
  >(null);

  const mutation = useMutation({
    mutationFn: () => toggleFollow(targetId),
    onSuccess: () => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });

  if (isOwn) {
    return (
      <Pill
        label="Editar perfil"
        variant="ghost"
        compact={compact}
        onPress={() => router.push('/(tabs)/profile')}
      />
    );
  }

  if (followStatus === null) {
    const label = targetIsPrivate ? 'Solicitar' : 'Seguir';
    return (
      <Pill
        label={label}
        variant="primary"
        compact={compact}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    );
  }

  if (followStatus === 'pending') {
    return (
      <>
        <Pill
          label="Solicitado"
          variant="muted"
          compact={compact}
          onPress={() => setConfirmOpen('cancel-request')}
        />
        <Confirm
          visible={confirmOpen === 'cancel-request'}
          title="Cancelar solicitud"
          message="Dejará de aparecer al usuario en sus solicitudes."
          confirmLabel="Cancelar solicitud"
          destructive
          onClose={() => setConfirmOpen(null)}
          onConfirm={() => {
            setConfirmOpen(null);
            mutation.mutate();
          }}
        />
      </>
    );
  }

  // accepted
  return (
    <>
      <Pill
        label="Siguiendo"
        variant="success"
        compact={compact}
        onPress={() => setConfirmOpen('unfollow')}
      />
      <Confirm
        visible={confirmOpen === 'unfollow'}
        title="Dejar de seguir"
        message={
          targetIsPrivate
            ? 'No volverás a ver sus posts hasta que vuelva a aceptarte.'
            : '¿Seguro que quieres dejar de seguir a este usuario?'
        }
        confirmLabel="Dejar de seguir"
        destructive
        onClose={() => setConfirmOpen(null)}
        onConfirm={() => {
          setConfirmOpen(null);
          mutation.mutate();
        }}
      />
    </>
  );
}

type PillProps = {
  label: string;
  variant: 'primary' | 'success' | 'muted' | 'ghost';
  onPress: () => void;
  compact?: boolean;
  loading?: boolean;
};

function Pill({ label, variant, onPress, compact, loading }: PillProps) {
  const styles = stylesByVariant(variant);
  const padding = compact ? 'px-3 py-1.5' : 'px-4 py-2';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      className={`rounded-full ${padding} ${styles.bg}`}
    >
      <Text className={`text-xs font-extrabold ${styles.text}`}>
        {loading ? '…' : label}
      </Text>
    </Pressable>
  );
}

function stylesByVariant(v: PillProps['variant']) {
  switch (v) {
    case 'success':
      return { bg: 'bg-emerald-500/30 active:bg-emerald-500/50', text: 'text-emerald-100' };
    case 'muted':
      return { bg: 'bg-brand-700 active:bg-brand-600', text: 'text-brand-200' };
    case 'ghost':
      return {
        bg: 'border border-brand-600 bg-transparent active:bg-brand-700/40',
        text: 'text-brand-100',
      };
    case 'primary':
    default:
      return { bg: 'bg-brand-300 active:bg-brand-200', text: 'text-brand-900' };
  }
}

function Confirm({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar diálogo"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/60 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
        >
          <Text className="mb-1 text-base font-extrabold text-white">{title}</Text>
          <Text className="mb-4 text-sm text-brand-200">{message}</Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
            >
              <Text className="text-center text-sm font-bold text-white">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              className={`flex-1 rounded-full py-2 ${
                destructive
                  ? 'bg-red-500/30 active:bg-red-500/50'
                  : 'bg-brand-300 active:bg-brand-200'
              }`}
            >
              <Text
                className={`text-center text-sm font-bold ${
                  destructive ? 'text-red-100' : 'text-brand-900'
                }`}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
