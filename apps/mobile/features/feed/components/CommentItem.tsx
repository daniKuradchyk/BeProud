import { Pressable, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { relativeTime } from '@/lib/relativeTime';
import type { Comment } from '@beproud/api';

type Props = {
  comment: Comment;
  currentUserId: string | null;
  /** Solo se muestra "Responder" para top-level (parent_id is null). */
  canReply: boolean;
  onReply: () => void;
  onDelete: () => void;
  /** Indenta el comentario si es respuesta. */
  indented?: boolean;
};

export default function CommentItem({
  comment,
  currentUserId,
  canReply,
  onReply,
  onDelete,
  indented,
}: Props) {
  const isOwn = currentUserId === comment.user_id;
  return (
    <View
      className="flex-row items-start py-3"
      style={indented ? { paddingLeft: 36 } : undefined}
    >
      <Avatar url={comment.avatar_url} name={comment.display_name} size={32} />
      <View className="ml-3 flex-1">
        <Text className="text-xs text-brand-300">
          <Text className="font-bold text-brand-100">@{comment.username}</Text>
          {' · '}
          {relativeTime(comment.created_at)}
        </Text>
        <Text className="mt-1 text-sm text-white">{comment.text}</Text>
        <View className="mt-1 flex-row gap-3">
          {canReply && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Responder"
              onPress={onReply}
              hitSlop={6}
            >
              <Text className="text-xs font-semibold text-brand-300">Responder</Text>
            </Pressable>
          )}
          {isOwn && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar comentario"
              onPress={onDelete}
              hitSlop={6}
            >
              <Text className="text-xs font-semibold text-red-300">Eliminar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
