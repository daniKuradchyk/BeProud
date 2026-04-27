import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import Button from '@/components/Button';
import { exportMyData } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

export default function DataSettings() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  const exportMut = useMutation({
    mutationFn: async () => {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      await saveOrShareJson(json);
      return true;
    },
    onSuccess: () => {
      setDoneAt(Date.now());
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo exportar'),
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/settings' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Mis datos</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="text-base font-extrabold text-white">
            Exportar mis datos
          </Text>
          <Text className="mt-2 text-sm text-brand-200">
            Descarga un archivo JSON con tu perfil, completions, posts,
            comentarios, follows iniciados, grupos, logros y notificaciones
            recientes.
          </Text>
          <Text className="mt-2 text-xs text-brand-300">
            Las fotos no se incluyen todavía. Próximamente añadiremos un .zip
            con los archivos asociados.
          </Text>
        </View>

        {error && (
          <Text className="mt-3 text-sm text-red-400" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        {doneAt && !error && (
          <Text className="mt-3 text-sm text-emerald-300">
            Exportación completada ✓
          </Text>
        )}

        <Button
          title="Descargar mis datos"
          onPress={() => exportMut.mutate()}
          loading={exportMut.isPending}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

async function saveOrShareJson(json: string): Promise<void> {
  const filename = `beproud-export-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  // Native: escribimos a documentDirectory y disparamos Sharing si está.
  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const path = `${FileSystem.documentDirectory ?? ''}${filename}`;
    await FileSystem.writeAsStringAsync(path, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/json' });
    }
  } catch (e) {
    console.warn('[notifications] export native fallback', e);
    throw e instanceof Error ? e : new Error('No se pudo guardar el archivo');
  }
}
