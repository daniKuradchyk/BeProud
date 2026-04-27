import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import Button from '@/components/Button';
import { useSession } from '@/lib/session';
import {
  createTaskCompletion,
  uploadTaskPhoto,
} from '@beproud/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Datos de la tarea a completar (los recibe TaskRow desde la rutina). */
  routineTaskId: string;
  /** Pasar exactamente uno: del catálogo o personalizado (Fase 15). */
  taskId?: string | null;
  userTaskId?: string | null;
  baseTitle: string;
  basePoints: number;
  baseHint: string | null;
};

type Stage = 'pick' | 'preview' | 'uploading' | 'success';

const MAX_SIDE = 1080;

/**
 * Sheet para capturar/elegir foto, comprimir y registrar la completion.
 * No incluye validación IA (Fase 9): la fila nace con ai_validation_status='skipped'.
 */
export default function CompleteSheet({
  visible,
  onClose,
  routineTaskId,
  taskId,
  userTaskId,
  baseTitle,
  basePoints,
  baseHint,
}: Props) {
  const { user, refreshRoutine, refreshProfile } = useSession();
  const [stage, setStage] = useState<Stage>('pick');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animación nativa "+N pts" tras éxito.
  const pointsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setStage('pick');
      setPickedUri(null);
      setError(null);
      setIsPublic(true);
      pointsAnim.setValue(0);
    }
  }, [visible, pointsAnim]);

  async function pickFromCamera() {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Permiso de cámara denegado.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setPickedUri(result.assets[0].uri);
    setStage('preview');
  }

  async function pickFromLibrary() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permiso de galería denegado.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setPickedUri(result.assets[0].uri);
    setStage('preview');
  }

  async function onConfirm() {
    if (!user || !pickedUri) return;
    setError(null);
    setStage('uploading');
    try {
      const { uri, ext, mime } = await compressImage(pickedUri);
      const blob = await fetchAsBlob(uri, mime);
      const path = await uploadTaskPhoto(user.id, blob, ext);
      await createTaskCompletion({
        routineTaskId,
        taskId:     taskId     ?? null,
        userTaskId: userTaskId ?? null,
        photoPath: path,
        pointsAwarded: basePoints,
        isPublic,
      });
      // Refrescamos rutina (para "Completado hoy ✓") y perfil (puntos+racha).
      await Promise.all([refreshRoutine(), refreshProfile()]);
      setStage('success');
      Animated.sequence([
        Animated.timing(pointsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(pointsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    } catch (e) {
      console.warn('[completions] onConfirm error', e);
      // Extrae mensaje + código (Supabase StorageError trae statusCode/error)
      // para que el usuario nos pueda reportar exactamente qué falla.
      let msg = 'No se pudo completar la tarea.';
      if (e instanceof Error) msg = e.message;
      else if (typeof e === 'object' && e !== null) {
        const err = e as { message?: string; statusCode?: string; error?: string };
        msg = err.message ?? err.error ?? msg;
        if (err.statusCode) msg = `[${err.statusCode}] ${msg}`;
      }
      setError(msg);
      setStage('preview');
    }
  }

  const translateY = pointsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -40],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-brand-800 px-6 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold text-white" numberOfLines={1}>
            {baseTitle}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onClose}
            hitSlop={12}
          >
            <Text className="text-base font-semibold text-brand-200">Cerrar</Text>
          </Pressable>
        </View>

        <Text className="mb-4 text-sm text-brand-200">
          {baseHint ?? 'Sube una foto que pruebe que has completado esta tarea.'}
          {' · '}
          <Text className="font-bold text-brand-100">+{basePoints} pts</Text>
        </Text>

        {error && (
          <Text
            className="mb-3 text-sm text-red-400"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}

        {stage === 'pick' && (
          <View className="mt-4 gap-3">
            <Button title="Hacer foto" onPress={pickFromCamera} />
            <Button title="Elegir de la galería" variant="secondary" onPress={pickFromLibrary} />
          </View>
        )}

        {(stage === 'preview' || stage === 'uploading' || stage === 'success') &&
          pickedUri && (
            <View className="mt-2 flex-1">
              <View className="overflow-hidden rounded-2xl border border-brand-700 bg-brand-900">
                <Image
                  source={{ uri: pickedUri }}
                  style={{ width: '100%', aspectRatio: 1 }}
                  resizeMode="cover"
                  accessibilityLabel="Vista previa de la foto"
                />
                {stage === 'success' && (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      alignSelf: 'center',
                      transform: [{ translateY }],
                      opacity: pointsAnim,
                    }}
                  >
                    <View className="rounded-full bg-brand-300 px-4 py-2">
                      <Text className="text-base font-extrabold text-brand-900">
                        +{basePoints} pts
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>

              <Pressable
                onPress={() => setIsPublic(!isPublic)}
                accessibilityRole="switch"
                accessibilityState={{ checked: isPublic }}
                accessibilityLabel="Publicar en el feed"
                className="mt-4 flex-row items-center justify-between rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-white">
                    Publicar en el feed
                  </Text>
                  <Text className="text-xs text-brand-300">
                    Tus amigos podrán verla.
                  </Text>
                </View>
                <View
                  className={`h-6 w-11 justify-center rounded-full p-0.5 ${
                    isPublic ? 'bg-brand-300' : 'bg-brand-600'
                  }`}
                >
                  <View
                    className={`h-5 w-5 rounded-full bg-white ${
                      isPublic ? 'ml-auto' : ''
                    }`}
                  />
                </View>
              </Pressable>

              <View className="mt-4 gap-3">
                <Button
                  title={
                    stage === 'uploading'
                      ? 'Subiendo…'
                      : stage === 'success'
                        ? '¡Completada!'
                        : 'Completar tarea'
                  }
                  onPress={onConfirm}
                  loading={stage === 'uploading'}
                  disabled={stage !== 'preview'}
                />
                {stage === 'preview' && (
                  <Button
                    title="Cambiar foto"
                    variant="secondary"
                    onPress={() => {
                      setPickedUri(null);
                      setStage('pick');
                    }}
                  />
                )}
              </View>

              {stage === 'uploading' && (
                <View className="mt-4 flex-row items-center justify-center gap-2">
                  <ActivityIndicator color="#A9C6E8" />
                  <Text className="text-sm text-brand-200">
                    Subiendo y registrando…
                  </Text>
                </View>
              )}
            </View>
          )}
      </View>
    </Modal>
  );
}

/**
 * Comprime a max 1080px lado mayor, formato webp con fallback jpeg.
 * En web webp suele dar problemas con expo-image-manipulator → forzamos jpeg.
 */
async function compressImage(
  uri: string,
): Promise<{ uri: string; ext: 'webp' | 'jpg'; mime: string }> {
  const actions = [{ resize: { width: MAX_SIDE } }];
  // En web, expo-image-manipulator no soporta WEBP en muchos navegadores.
  if (Platform.OS !== 'web') {
    try {
      const out = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.WEBP,
      });
      return { uri: out.uri, ext: 'webp', mime: 'image/webp' };
    } catch (e) {
      console.warn('[completions] webp falló, uso jpeg', e);
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
  // En algunas plataformas el blob queda con type vacío; lo forzamos.
  if (!blob.type) {
    return blob.slice(0, blob.size, mime);
  }
  return blob;
}
