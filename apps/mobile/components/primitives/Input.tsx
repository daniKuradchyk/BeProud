import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInput as RNTextInput, type TextInputProps } from 'react-native';
import Body from './Body';
import Caption from './Caption';
import { haptic } from '@/lib/theme/haptics';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  helper?: string;
  error?: string;
  className?: string;
};

/**
 * Wrapper de TextInput con label opcional, helper/error y borde animado.
 * Soporta `ref` para imperativos (focus, blur).
 */
const Input = forwardRef<RNTextInput, Props>(function Input(
  { label, helper, error, className = '', onFocus, onBlur, accessibilityLabel, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderCls = error
    ? 'border-coral-400'
    : focused
      ? 'border-bp-500'
      : 'border-surface-3';

  return (
    <View className={className}>
      {label && (
        <Caption variant="overline" tone={2} className="mb-1">
          {label}
        </Caption>
      )}
      <TextInput
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor="#7A7A8C"
        onFocus={(e) => { setFocused(true); haptic.light(); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className={`rounded-md border bg-surface-2 px-4 py-3 text-body text-ink-1 ${borderCls}`}
        {...rest}
      />
      {error ? (
        <Body size="sm" tone={1} className="mt-1 text-coral-400">{error}</Body>
      ) : helper ? (
        <Body size="sm" tone={3} className="mt-1">{helper}</Body>
      ) : null}
    </View>
  );
});

export default Input;
