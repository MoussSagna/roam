import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cx } from '@/lib/cx';
import { textVariantClasses, type TextVariant } from '@/theme';

type Tone = 'default' | 'secondary' | 'primary' | 'onPrimary';

const toneClasses: Record<Tone, string> = {
  default: 'text-text',
  secondary: 'text-textSecondary',
  primary: 'text-primary',
  onPrimary: 'text-primaryForeground',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: Tone;
  className?: string;
};

/** All ROAM text goes through here so size, font and color always come from the tokens. */
export function Text({ variant = 'body', tone = 'default', className, ...props }: TextProps) {
  return (
    <RNText className={cx(textVariantClasses[variant], toneClasses[tone], className)} {...props} />
  );
}
