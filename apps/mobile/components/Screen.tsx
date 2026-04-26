import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
};

export default function Screen({ children, scroll = false, className }: Props) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Container
        className={`flex-1 px-6 ${className ?? ''}`}
        {...(scroll
          ? { contentContainerStyle: { paddingVertical: 24, flexGrow: 1 } }
          : {})}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
