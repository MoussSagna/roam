import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Text, View, type ImageSourcePropType } from 'react-native';

import { brand, derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

/**
 * Photo collage of the welcome screen. Coordinates are in design points (mockup width 390).
 * Everything is multiplied by `scale` (which shrinks on short screens). Horizontally, the two outer
 * cards stay glued to their screen edge (so they keep bleeding off it) and the two central cards stay
 * anchored to the screen center, which keeps the overlap between them identical on every width.
 */
const DESIGN_WIDTH = 390;

type Anchor = 'left' | 'center' | 'right';
export const COLLAGE_DESIGN_HEIGHT = 435;

type CardSpec = {
  image: ImageSourcePropType;
  /** Horizontal reference of `cx`: a screen edge, or the screen center. */
  anchor: Anchor;
  /** Center of the card, design pt, relative to the collage box. */
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotate: number;
};

const CARDS: CardSpec[] = [
  {
    image: require('../../../../assets/images/onboarding/welcome-cafe.png'),
    anchor: 'left',
    cx: 8,
    cy: 245,
    width: 60,
    height: 184,
    rotate: -2,
  },
  {
    image: require('../../../../assets/images/onboarding/welcome-terrace.png'),
    anchor: 'right',
    cx: 306,
    cy: 143,
    width: 153,
    height: 244,
    rotate: 10,
  },
  {
    image: require('../../../../assets/images/onboarding/welcome-street.png'),
    anchor: 'center',
    cx: 129,
    cy: 173,
    width: 207,
    height: 280,
    rotate: -8,
  },
  {
    image: require('../../../../assets/images/onboarding/welcome-lake.png'),
    anchor: 'center',
    cx: 256,
    cy: 316,
    width: 224,
    height: 162,
    rotate: 6,
  },
];

const BORDER = 7;

type WelcomeCollageProps = {
  /** Available width (screen width) and size factor. */
  width: number;
  scale: number;
};

export function WelcomeCollage({ width, scale }: WelcomeCollageProps) {
  const { t } = useTranslation();
  /** Horizontal position of a card center, in screen points. */
  const centerX = (card: CardSpec) => {
    if (card.anchor === 'left') return card.cx * scale;
    if (card.anchor === 'right') return width - (DESIGN_WIDTH - card.cx) * scale;
    return width / 2 + (card.cx - DESIGN_WIDTH / 2) * scale;
  };

  return (
    <View style={{ height: COLLAGE_DESIGN_HEIGHT * scale }}>
      {CARDS.map((card, i) => {
        const w = card.width * scale;
        const h = card.height * scale;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: centerX(card) - w / 2,
              top: card.cy * scale - h / 2,
              width: w,
              height: h,
              padding: BORDER * scale,
              borderRadius: 18 * scale,
              backgroundColor: brand.white,
              transform: [{ rotate: `${card.rotate}deg` }],
              shadowColor: derived.black,
              shadowOpacity: 0.18,
              shadowRadius: 14 * scale,
              shadowOffset: { width: 0, height: 6 * scale },
              elevation: 6,
            }}
          >
            <Image
              source={card.image}
              contentFit="cover"
              style={{ flex: 1, borderRadius: 12 * scale }}
            />
          </View>
        );
      })}

      <Text
        className="text-text/85"
        style={{
          position: 'absolute',
          left: 33.6,
          top: 353 * scale,
          fontFamily: fontFamily.script,
          fontSize: 32 * scale,
          lineHeight: 30 * scale,
          transform: [{ rotate: '-9deg' }],
        }}
      >
        {t('onboarding.welcome.script')}
      </Text>
    </View>
  );
}
