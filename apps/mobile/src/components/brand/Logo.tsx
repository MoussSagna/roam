import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

/**
 * Logo files live in `assets/images/logo/`. They are PLACEHOLDERS until the official
 * logo is added: replace the PNGs, keep the file names (see assets/images/logo/README.md).
 */
const sources = {
  light: require('../../../assets/images/logo/logo-light.png'),
  dark: require('../../../assets/images/logo/logo-dark.png'),
  icon: require('../../../assets/images/logo/logo-icon.png'),
} as const;

export type LogoVariant = keyof typeof sources | 'auto';

type LogoProps = {
  /** `light`: mark for light backgrounds, `dark`: for dark backgrounds, `auto`: follows the theme. */
  variant?: LogoVariant;
  size?: number;
};

export function Logo({ variant = 'auto', size = 72 }: LogoProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const resolved = variant === 'auto' ? scheme : variant;

  return (
    <Image
      source={sources[resolved]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={t('brand.logoAlt')}
    />
  );
}
