import { Modal as RNModal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Si false, el tap en backdrop no cierra. Default true. */
  dismissOnBackdrop?: boolean;
};

/**
 * Modal centrado con backdrop semitransparente. El contenido entra/sale con
 * fade. Usar BottomSheet en vez de éste cuando el contenido vaya pegado abajo.
 */
export default function Modal({
  visible, onClose, children, dismissOnBackdrop = true,
}: Props) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(120)}
        className="flex-1 items-center justify-center bg-black/60 px-6"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          disabled={!dismissOnBackdrop}
          onPress={onClose}
          className="absolute inset-0"
        />
        <View className="w-full max-w-sm rounded-xl bg-surface-2 p-5 shadow-lift-2">
          {children}
        </View>
      </Animated.View>
    </RNModal>
  );
}
