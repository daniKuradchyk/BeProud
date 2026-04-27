import { View } from 'react-native';
import Body from './Body';
import Button from './Button';
import Heading from './Heading';

type Props = {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; onPress: () => void };
  className?: string;
};

/**
 * Layout vertical centrado para estados vacíos. Pasa una ilustración SVG en
 * `illustration` (recomendado 160x160) y opcionalmente un CTA primario.
 */
export default function EmptyState({
  illustration, title, description, cta, className = '',
}: Props) {
  return (
    <View className={`flex-1 items-center justify-center px-6 py-12 ${className}`}>
      {illustration && <View className="mb-4">{illustration}</View>}
      <Heading size="md" className="text-center">
        {title}
      </Heading>
      {description && (
        <Body size="md" tone={2} className="mt-2 text-center">
          {description}
        </Body>
      )}
      {cta && (
        <View className="mt-6">
          <Button title={cta.label} onPress={cta.onPress} />
        </View>
      )}
    </View>
  );
}
