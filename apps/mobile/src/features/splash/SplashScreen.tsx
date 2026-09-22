import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/auth';
import { Logo } from '@/components/brand/Logo';
import { FadeInUp } from '@/components/ui';
import { brand, derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { computeSplashLayout } from './splashLayout';

const background = require('../../../assets/images/splash-background.png');
const wordmark = require('../../../assets/images/logo/roam-wordmark-light.png');

/** How long the splash stays before moving on to the Welcome screen. */
const SPLASH_DURATION_MS = 2600;

/**
 * In-app splash screen (docs/03_UX_SCREENS_AND_FLOWS.md → 01 Splash), reproducing the design
 * mockup. Not to be confused with the native splash configured in `app.json`, which the OS shows
 * while the JS bundle loads.
 *
 * The photo is dark in both themes, so the text colors here are fixed on purpose.
 */
export function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { width, height } = useWindowDimensions();
  const layout = computeSplashLayout({ width, height });

  useEffect(() => {
    // A restored mocked session skips straight to Home; otherwise the usual Welcome entry.
    const timer = setTimeout(
      () => router.replace(isLoggedIn ? '/home' : '/welcome'),
      SPLASH_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [router, isLoggedIn]);

  const absolute = (box: { left: number; top: number; width: number; height: number }) => ({
    position: 'absolute' as const,
    ...box,
  });

  return (
    <View className="flex-1 bg-background">
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 600 }}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <Image source={background} contentFit="cover" style={{ flex: 1 }} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: derived.night,
            opacity: 0.34,
          }}
        />
      </MotiView>

      <FadeInUp delay={200} style={absolute(layout.logo)}>
        <Logo variant="dark" size={layout.logo.width} />
      </FadeInUp>

      <FadeInUp delay={450} style={absolute(layout.wordmark)}>
        <Image
          source={wordmark}
          contentFit="contain"
          tintColor={brand.cream}
          accessibilityLabel={t('brand.name')}
          style={{ width: layout.wordmark.width, height: layout.wordmark.height }}
        />
      </FadeInUp>

      <FadeInUp
        delay={700}
        style={{
          position: 'absolute',
          left: layout.tagline.offsetX,
          right: -layout.tagline.offsetX,
          top: layout.tagline.top,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            color: brand.cream,
            fontFamily: fontFamily.body,
            fontSize: layout.tagline.fontSize,
            lineHeight: layout.tagline.height,
            letterSpacing: layout.tagline.letterSpacing,
            textTransform: 'uppercase',
            // RN adds the letter spacing after the last glyph too: pull the text back to center it.
            paddingLeft: layout.tagline.letterSpacing,
          }}
        >
          {t('splash.tagline')}
        </Text>
      </FadeInUp>
      <FadeInUp delay={700} style={absolute(layout.divider)}>
        <View style={{ flex: 1, backgroundColor: brand.sage, opacity: 0.55 }} />
      </FadeInUp>

      <FadeInUp
        delay={950}
        style={{ position: 'absolute', left: layout.headline.left, top: layout.headline.top }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: brand.cream,
            fontFamily: fontFamily.editorial,
            fontSize: layout.headline.fontSize,
            lineHeight: layout.headline.lineHeight,
          }}
        >
          {`${t('splash.verbs.explore')}\n${t('splash.verbs.feel')}\n${t('splash.verbs.goOut')}`}
        </Text>
      </FadeInUp>

      <FadeInUp delay={1100} style={absolute(layout.rule)}>
        <View style={{ flex: 1, backgroundColor: brand.cream }} />
      </FadeInUp>

      <FadeInUp
        delay={1100}
        style={{ position: 'absolute', left: layout.captions.left, top: layout.captions.top }}
      >
        <Text
          style={{
            color: brand.cream,
            fontFamily: fontFamily.body,
            fontSize: layout.captions.fontSize,
            lineHeight: layout.captions.lineHeight,
            letterSpacing: layout.captions.letterSpacing,
            textTransform: 'uppercase',
          }}
        >
          {`${t('splash.categories')}\n${t('splash.more')}`}
        </Text>
      </FadeInUp>
    </View>
  );
}
