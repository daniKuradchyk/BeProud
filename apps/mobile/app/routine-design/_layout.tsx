import { Stack } from 'expo-router';

export default function RoutineDesignLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F253B' },
      }}
    />
  );
}
