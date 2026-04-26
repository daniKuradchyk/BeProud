import { Image, Text, View } from 'react-native';

import { relativeTime } from '@/lib/relativeTime';
import type { Message } from '@beproud/api';

type Props = {
  message: Message;
  isMine: boolean;
};

/** Bubble derecha (mío) o izquierda (otro). Soporta texto, imagen o ambos. */
export default function MessageBubble({ message, isMine }: Props) {
  const align = isMine ? 'items-end' : 'items-start';
  const bg = isMine ? 'bg-brand-300' : 'bg-brand-700/60';
  const txt = isMine ? 'text-brand-900' : 'text-white';
  const time = isMine ? 'text-brand-700' : 'text-brand-300';

  return (
    <View className={`my-1 ${align}`}>
      <View className={`max-w-[80%] rounded-2xl px-3 py-2 ${bg}`}>
        {message.media_signed_url ? (
          <Image
            source={{ uri: message.media_signed_url }}
            style={{ width: 220, aspectRatio: 1, borderRadius: 12 }}
            resizeMode="cover"
            accessibilityLabel="Imagen enviada"
          />
        ) : null}
        {message.content ? (
          <Text className={`text-sm ${txt} ${message.media_signed_url ? 'mt-2' : ''}`}>
            {message.content}
          </Text>
        ) : null}
        <Text className={`mt-1 text-[10px] ${time}`}>
          {relativeTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}
