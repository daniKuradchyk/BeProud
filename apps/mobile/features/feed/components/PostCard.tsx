import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Avatar from '@/components/Avatar';
import { relativeTime } from '@/lib/relativeTime';
import type { FeedItem } from '@beproud/api';

type Props = {
  post: FeedItem;
  currentUserId: string | null;
  onToggleLike: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
  /** Si false, no navega al pulsar la foto (ya estamos en detalle). */
  navigateOnPress?: boolean;
};

/** Tarjeta de feed: header autor + foto + acciones + caption. */
export default function PostCard({
  post,
  currentUserId,
  onToggleLike,
  onReport,
  onBlock,
  onDelete,
  navigateOnPress = true,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = currentUserId === post.user_id;

  // Animación nativa del corazón al pulsar.
  const scale = useRef(new Animated.Value(1)).current;
  const animateLike = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 140, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Perfil de ${post.username}`}
          onPress={() => router.push(`/user/${post.username}` as never)}
          className="flex-row items-center"
        >
          <Avatar url={post.avatar_url} name={post.display_name} size={36} />
          <View className="ml-3">
            <Text className="text-sm font-bold text-white">{post.display_name}</Text>
            <Text className="text-[11px] text-brand-300">
              @{post.username} · {relativeTime(post.created_at)}
            </Text>
          </View>
        </Pressable>
        <View className="flex-1" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-xl font-bold text-brand-200">⋯</Text>
        </Pressable>
      </View>

      {/* Foto */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir post de ${post.task_title}`}
        disabled={!navigateOnPress}
        onPress={() => router.push(`/post/${post.id}` as never)}
        className="mt-3"
      >
        {post.signed_url ? (
          <Image
            source={{ uri: post.signed_url }}
            style={{ width: '100%', aspectRatio: 1 }}
            resizeMode="cover"
            accessibilityLabel={`Foto de ${post.task_title}`}
          />
        ) : (
          <View
            style={{ width: '100%', aspectRatio: 1 }}
            className="items-center justify-center bg-brand-900"
          >
            <Text className="text-xs text-brand-400">sin foto</Text>
          </View>
        )}
      </Pressable>

      {/* Tarea */}
      <View className="flex-row items-center px-4 pt-3">
        <Text className="mr-2 text-lg">{post.task_icon ?? '✓'}</Text>
        <Text className="flex-1 text-sm font-bold text-white" numberOfLines={1}>
          {post.task_title}
        </Text>
        <Text className="text-xs font-extrabold text-brand-200">
          +{post.points_awarded} pts
        </Text>
      </View>

      {/* Acciones */}
      <View className="mt-3 flex-row items-center px-4 pb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.liked_by_me ? 'Quitar like' : 'Dar like'}
          accessibilityState={{ selected: post.liked_by_me }}
          onPress={() => {
            animateLike();
            onToggleLike();
          }}
          className="flex-row items-center"
          hitSlop={8}
        >
          <Animated.Text
            style={{ transform: [{ scale }], fontSize: 20, lineHeight: 22 }}
          >
            {post.liked_by_me ? '❤️' : '🤍'}
          </Animated.Text>
          <Text className="ml-1 text-sm font-semibold text-brand-100">
            {post.likes_count}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver comentarios"
          onPress={() => router.push(`/post/${post.id}` as never)}
          className="ml-5 flex-row items-center"
          hitSlop={8}
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>💬</Text>
          <Text className="ml-1 text-sm font-semibold text-brand-100">
            {post.comments_count}
          </Text>
        </Pressable>
      </View>

      {/* Caption */}
      {post.caption && (
        <Text className="px-4 pb-3 text-sm text-brand-100">{post.caption}</Text>
      )}

      {/* Menú ⋯ */}
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={
          isOwn
            ? [
                {
                  label: 'Eliminar post',
                  destructive: true,
                  onPress: () => {
                    setMenuOpen(false);
                    onDelete();
                  },
                },
              ]
            : [
                {
                  label: 'Reportar',
                  onPress: () => {
                    setMenuOpen(false);
                    onReport();
                  },
                },
                {
                  label: 'Bloquear usuario',
                  destructive: true,
                  onPress: () => {
                    setMenuOpen(false);
                    onBlock();
                  },
                },
              ]
        }
      />
    </View>
  );
}

type Action = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function ActionSheet({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: Action[];
}) {
  // Cierra al pulsar fuera. Animado con la API nativa.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar menú"
        onPress={onClose}
        className="flex-1 justify-end bg-black/60"
      >
        <Animated.View
          style={{ opacity: fade }}
          className="rounded-t-3xl border-t border-brand-700 bg-brand-800 px-6 pb-8 pt-4"
        >
          <View className="mb-3 self-center h-1 w-10 rounded-full bg-brand-600" />
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              className="rounded-xl bg-brand-700/60 px-4 py-3 active:bg-brand-600/60"
              style={{ marginBottom: 8 }}
            >
              <Text
                className={`text-center text-base font-bold ${
                  a.destructive ? 'text-red-300' : 'text-white'
                }`}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={onClose}
            className="mt-1 rounded-xl px-4 py-3"
          >
            <Text className="text-center text-base font-bold text-brand-200">
              Cancelar
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
