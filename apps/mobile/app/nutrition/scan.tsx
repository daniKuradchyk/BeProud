import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CameraView } from 'expo-camera';

import { lookupFoodByBarcode, upsertOffProductAsFoodItem } from '@beproud/api';
import { MealTypeSchema } from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import { backOrReplace } from '@/lib/navigation/back';

export default function NutritionScan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string }>();
  const meal = MealTypeSchema.safeParse(params.meal).success ? params.meal : null;
  const fallback = (meal ? `/nutrition/meal/${meal}` : '/nutrition') as never;

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader
          title="Escanear"
          onBack={() => backOrReplace(router, fallback)}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl">📷</Text>
          <Text className="mt-2 text-center text-base font-bold text-white">
            El escaneo solo está disponible en móvil
          </Text>
          <Text className="mt-1 text-center text-sm text-brand-300">
            Usa la búsqueda por texto desde la web.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.replace(
                `/nutrition/search${meal ? `?meal=${meal}` : ''}` as never,
              )
            }
            className="mt-6 rounded-full bg-brand-300 px-5 py-3 active:bg-brand-200"
          >
            <Text className="text-sm font-extrabold text-brand-900">
              Buscar por texto
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <ScanNative meal={meal ?? null} />;
}

function ScanNative({ meal }: { meal: string | null }) {
  const router = useRouter();
  const fallback = (meal ? `/nutrition/meal/${meal}` : '/nutrition') as never;
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    let active = true;
    Camera.requestCameraPermissionsAsync()
      .then((res) => {
        if (!active) return;
        setPermission(res.granted ? 'granted' : 'denied');
      })
      .catch(() => {
        if (active) setError('No se pudo acceder a la cámara');
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleScan(code: string) {
    if (busy) return;
    const now = Date.now();
    if (lastScan.current && lastScan.current.code === code && now - lastScan.current.at < 2000) {
      return;
    }
    lastScan.current = { code, at: now };
    setBusy(true);
    Vibration.vibrate(50);
    try {
      const product = await lookupFoodByBarcode(code);
      if (!product) {
        router.replace(
          `/nutrition/custom-food?barcode=${encodeURIComponent(code)}${meal ? `&meal=${meal}` : ''}` as never,
        );
        return;
      }
      const id = await upsertOffProductAsFoodItem(product);
      router.replace(
        `/nutrition/food/${id}${meal ? `?meal=${meal}` : ''}` as never,
      );
    } catch {
      setError('Error al buscar el producto. Inténtalo de nuevo.');
      setBusy(false);
    }
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader
          title="Escanear"
          onBack={() => backOrReplace(router, fallback)}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-red-300">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permission === 'unknown') {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader
          title="Escanear"
          onBack={() => backOrReplace(router, fallback)}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-brand-300">Preparando cámara…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permission === 'denied') {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader
          title="Escanear"
          onBack={() => backOrReplace(router, fallback)}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl">🔒</Text>
          <Text className="mt-2 text-center text-base font-bold text-white">
            Necesitamos acceso a la cámara
          </Text>
          <Text className="mt-1 text-center text-sm text-brand-300">
            Concede el permiso para escanear códigos de barras.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              const res = await Camera.requestCameraPermissionsAsync();
              setPermission(res.granted ? 'granted' : 'denied');
            }}
            className="mt-6 rounded-full bg-brand-300 px-5 py-3 active:bg-brand-200"
          >
            <Text className="text-sm font-extrabold text-brand-900">
              Conceder permiso
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={busy ? undefined : ({ data }) => handleScan(data)}
      >
        <SafeAreaView className="flex-1">
          <NutritionHeader
            title="Escanear código"
            onBack={() => backOrReplace(router, fallback)}
          />
          <View className="flex-1 items-center justify-center">
            <View
              className="rounded-2xl border-2 border-white/80"
              style={{ width: 280, height: 160 }}
            />
            <Text className="mt-4 text-sm text-white/80">
              Centra el código de barras en el recuadro
            </Text>
          </View>
          <View className="items-center pb-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => backOrReplace(router, fallback)}
              className="rounded-full bg-white/20 px-5 py-2 active:bg-white/30"
            >
              <Text className="text-sm font-bold text-white">Cancelar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
