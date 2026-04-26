import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
};

const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, className, ...rest },
  ref,
) {
  return (
    <View className="mb-4 w-full">
      {label && (
        <Text className="mb-1.5 text-sm font-semibold text-brand-100">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor="#7DA9DC"
        className={`rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white ${
          error ? 'border-red-400' : ''
        } ${className ?? ''}`}
        {...rest}
      />
      {error ? (
        <Text className="mt-1 text-xs text-red-400">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-brand-300">{hint}</Text>
      ) : null}
    </View>
  );
});

export default Input;
