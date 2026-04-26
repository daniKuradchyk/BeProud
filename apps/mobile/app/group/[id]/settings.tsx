import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import Button from '@/components/Button';
import Input from '@/components/Input';
import {
  deleteGroup,
  fetchGroupById,
  regenerateInviteCode,
  updateGroup,
  uploadGroupCover,
} from '@beproud/api';

const MAX_SIDE = 1080;

export default function GroupSettings() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const groupKey = ['group', id] as const;

  const group = useQuery({
    queryKey: groupKey,
    queryFn: () => fetchGroupById(id),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!group.data) return;
    setName(group.data.name);
    setDescription(group.data.description ?? '');
    setIsPrivate(group.data.is_private);
  }, [group.data?.id, group.data?.name, group.data?.description, group.data?.is_private]);

  const isOwner = group.data?.my_role === 'owner';
  const isMod = isOwner || group.data?.my_role === 'admin';

  const saveMutation = useMutation({
    mutationFn: async () => {
      let coverUrl = group.data?.cover_url ?? null;
      if (coverUri) {
        const compressed = await compressImage(coverUri);
        const blob = await fetchAsBlob(compressed.uri, compressed.mime);
        coverUrl = await uploadGroupCover(id, blob, compressed.ext);
      }
      await updateGroup(id, {
        name: name.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
        cover_url: coverUrl,
      });
    },
    onSuccess: () => {
      setSavedAt(Date.now());
      setCoverUri(null);
      qc.invalidateQueries({ queryKey: groupKey });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateInviteCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKey }),
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-groups'] });
      router.replace('/groups' as never);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  if (group.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }
  if (!group.data) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800 px-6">
        <Text className="text-base font-bold text-white">Grupo no encontrado</Text>
        <Text className="mt-1 text-center text-sm text-brand-200">
          No tienes acceso a este grupo o ya no existe.
        </Text>
      </View>
    );
  }

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

  const dirty =
    name.trim() !== group.data.name ||
    (description.trim() || null) !== (group.data.description ?? null) ||
    isPrivate !== group.data.is_private ||
    !!coverUri;

  async function copyCode() {
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      try {
        await (navigator as Navigator).clipboard?.writeText(group.data!.invite_code);
      } catch {
        /* ignored */
      }
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-800"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cambiar cover"
        onPress={onPickCover}
        className="mb-4 overflow-hidden rounded-2xl border border-brand-700 bg-brand-800/60"
      >
        {(coverUri ?? group.data.cover_url) ? (
          <Image
            source={{ uri: coverUri ?? group.data.cover_url! }}
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            className="items-center justify-center"
          >
            <Text className="text-4xl">🖼️</Text>
            <Text className="mt-2 text-xs text-brand-300">Pulsa para cambiar</Text>
          </View>
        )}
      </Pressable>

      <Input
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Nombre del grupo"
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
        className="mb-4 flex-row items-center justify-between rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-white">Grupo privado</Text>
          <Text className="text-xs text-brand-300">
            Si se desactiva, cualquiera podrá encontrar el grupo.
          </Text>
        </View>
        <View
          className={`h-6 w-11 justify-center rounded-full p-0.5 ${
            isPrivate ? 'bg-brand-300' : 'bg-brand-600'
          }`}
        >
          <View
            className={`h-5 w-5 rounded-full bg-white ${isPrivate ? 'ml-auto' : ''}`}
          />
        </View>
      </Pressable>

      {error && <Text className="mb-3 text-sm text-red-400">{error}</Text>}
      {savedAt && !dirty && !error && (
        <Text className="mb-3 text-sm text-emerald-300">Guardado ✓</Text>
      )}

      <Button
        title="Guardar cambios"
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!dirty || !isMod}
      />

      {/* Invite code */}
      <View className="mt-8 rounded-xl border border-brand-700 bg-brand-800/60 p-4">
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Código de invitación
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 rounded-lg bg-brand-900 px-3 py-2">
            <Text className="text-lg font-mono font-extrabold text-white">
              {group.data.invite_code}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar código"
            onPress={copyCode}
            className="rounded-full bg-brand-300 px-3 py-2 active:bg-brand-200"
          >
            <Text className="text-xs font-extrabold text-brand-900">Copiar</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-xs text-brand-300">
          Enlace: beproud://g/{group.data.invite_code}
        </Text>
        {isOwner && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Regenerar código"
            onPress={() => setConfirmRegen(true)}
            className="mt-3 rounded-full bg-brand-700 px-3 py-2 active:bg-brand-600"
          >
            <Text className="text-center text-xs font-bold text-brand-200">
              Regenerar código
            </Text>
          </Pressable>
        )}
      </View>

      {isOwner && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar grupo"
          onPress={() => setConfirmDel(1)}
          className="mt-8 rounded-full bg-red-500/20 px-4 py-3 active:bg-red-500/40"
        >
          <Text className="text-center text-sm font-extrabold text-red-200">
            Eliminar grupo
          </Text>
        </Pressable>
      )}

      <Modal
        visible={confirmRegen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRegen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => setConfirmRegen(false)}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
          >
            <Text className="mb-1 text-base font-extrabold text-white">
              Regenerar código
            </Text>
            <Text className="mb-4 text-sm text-brand-200">
              El código actual dejará de funcionar. Los enlaces compartidos antes
              serán inválidos.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => setConfirmRegen(false)}
                className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
              >
                <Text className="text-center text-sm font-bold text-white">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Regenerar"
                disabled={regenMutation.isPending}
                onPress={() => {
                  regenMutation.mutate();
                  setConfirmRegen(false);
                }}
                className="flex-1 rounded-full bg-brand-300 py-2 active:bg-brand-200"
              >
                <Text className="text-center text-sm font-bold text-brand-900">
                  Regenerar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={confirmDel > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDel(0)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => setConfirmDel(0)}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
          >
            <Text className="mb-1 text-base font-extrabold text-white">
              {confirmDel === 1 ? 'Eliminar grupo' : '¿Estás seguro?'}
            </Text>
            <Text className="mb-4 text-sm text-brand-200">
              {confirmDel === 1
                ? 'Se borrará el grupo, el chat, los miembros y todos los mensajes. Acción irreversible.'
                : 'Pulsa "Eliminar definitivamente" para confirmar.'}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => setConfirmDel(0)}
                className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
              >
                <Text className="text-center text-sm font-bold text-white">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirmDel === 1 ? 'Continuar' : 'Eliminar definitivamente'}
                disabled={deleteMutation.isPending}
                onPress={() => {
                  if (confirmDel === 1) setConfirmDel(2);
                  else deleteMutation.mutate();
                }}
                className="flex-1 rounded-full bg-red-500/30 py-2 active:bg-red-500/50"
              >
                <Text className="text-center text-sm font-bold text-red-100">
                  {confirmDel === 1 ? 'Continuar' : 'Eliminar definitivamente'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
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
