import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import Button from '@/components/Button';
import Input from '@/components/Input';
import { createGroup, updateGroup, uploadGroupCover } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

const MAX_SIDE = 1080;

export default function NewGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickCover() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permiso de galería denegado.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    setCoverUri(result.assets[0].uri);
  }

  async function onCreate() {
    setError(null);
    if (name.trim().length < 3 || name.trim().length > 60) {
      setError('El nombre debe tener entre 3 y 60 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const groupId = await createGroup({
        name,
        description: description.trim() || null,
        isPrivate,
      });
      // Si hay cover, subimos y actualizamos el grupo (el bucket exige owner,
      // que ya somos tras create_group).
      if (coverUri) {
        const compressed = await compressImage(coverUri);
        const blob = await fetchAsBlob(compressed.uri, compressed.mime);
        const url = await uploadGroupCover(groupId, blob, compressed.ext);
        await updateGroup(groupId, { cover_url: url });
      }
      router.replace(`/group/${groupId}` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el grupo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/groups' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center pr-12">
          <Text className="text-base font-bold text-white">Nuevo grupo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir cover"
          onPress={onPickCover}
          className="mb-4 overflow-hidden rounded-2xl border border-brand-700 bg-brand-800/60"
        >
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              className="items-center justify-center"
            >
              <Text className="text-4xl">🖼️</Text>
              <Text className="mt-2 text-xs text-brand-300">
                Pulsa para elegir una imagen
              </Text>
            </View>
          )}
        </Pressable>

        <Input
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="ej: Equipo de mañanas"
          maxLength={60}
        />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
          multiline
          numberOfLines={3}
          maxLength={280}
          hint={`${description.length}/280`}
          className="min-h-[88px] py-3"
        />

        <Pressable
          onPress={() => setIsPrivate(!isPrivate)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isPrivate }}
          className="mb-6 flex-row items-center justify-between rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-white">Grupo privado</Text>
            <Text className="text-xs text-brand-300">
              Solo accesible mediante código de invitación.
            </Text>
          </View>
          <View
            className={`h-6 w-11 justify-center rounded-full p-0.5 ${
              isPrivate ? 'bg-brand-300' : 'bg-brand-600'
            }`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-white ${
                isPrivate ? 'ml-auto' : ''
              }`}
            />
          </View>
        </Pressable>

        {error && (
          <Text className="mb-3 text-sm text-red-400" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Button title="Crear grupo" onPress={onCreate} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

async function compressImage(
  uri: string,
): Promise<{ uri: string; ext: 'webp' | 'jpg'; mime: string }> {
  const actions = [{ resize: { width: MAX_SIDE } }];
  if (Platform.OS !== 'web') {
    try {
      const out = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.WEBP,
      });
      return { uri: out.uri, ext: 'webp', mime: 'image/webp' };
    } catch (e) {
      console.warn('[groups] webp falló, uso jpeg', e);
    }
  }
  const out = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, ext: 'jpg', mime: 'image/jpeg' };
}

async function fetchAsBlob(uri: string, mime: string): Promise<Blob> {
  const res = await fetch(uri);
  const blob = await res.blob();
  if (!blob.type) return blob.slice(0, blob.size, mime);
  return blob;
}
