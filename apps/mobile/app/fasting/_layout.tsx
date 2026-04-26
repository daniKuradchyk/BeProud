import { Stack } from 'expo-router';

export default function FastingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F253B' },
      }}
    />
  );
}
