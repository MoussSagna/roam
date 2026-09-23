import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  STICKY_FOOTER_CLEARANCE,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  Slider,
  StickyActionFooter,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { InterestTile } from '@/features/onboarding/components/InterestTile';
import { useCtaVisibility } from '@/hooks/useCtaVisibility';
import { showToast } from '@/lib/toast';
import { useTheme } from '@/theme';

import { AMBIANCE_OPTIONS, DEFAULT_AMBIANCE } from './data/ambianceOptions';
import { DEFAULT_EXPERIENCE_TYPES, EXPERIENCE_TYPES } from './data/experienceTypes';

const DEFAULT_BUDGET = 25;
const DEFAULT_DISTANCE = 10;
/** How long "Enregistrer mes préférences" simulates a request before returning to Profile. */
const SAVE_DELAY_MS = 700;
const GRID_GAP = 12;
const TILE_HEIGHT = 92;
/** `ScrollScreen`'s own horizontal padding (`px-6` = 24px each side). */
const SCREEN_HORIZONTAL_PADDING = 48;
/** Roughly the height of the in-content title below — where the header's own title should be fully
 * revealed (same "proxy, not a pixel-exact measurement" approach as experience detail's own
 * `revealOffset`, D-49). */
const HEADER_REVEAL_OFFSET = 90;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * "Mes préférences" (sprint 5, écran 3): types d'expériences and ambiance (both multi-select tile
 * grids), budget and distance (sliders). Everything is local state, reset to the mockup's own
 * defaults by "Réinitialiser"; "Enregistrer mes préférences" simulates a save then returns to
 * Profile — no repository, no backend (`docs/DECISIONS.md`). The save CTA is a `StickyActionFooter`
 * (D-52), the same floating-footer pattern and `useCtaVisibility` hook as experience detail's
 * "Créer mon parcours" (D-49) — hides on a sustained downward scroll, comes back once the scroll
 * gesture ends or reverses. The header is a `StickyRevealHeader` (D-55/D-56): back/"Réinitialiser"
 * stay pinned, and its own small title crossfades in once the in-content title scrolls out of view.
 */
export function PreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const {
    visible: ctaVisible,
    handleScrollOffset: ctaOnScroll,
    handleScrollEnd: ctaOnScrollEnd,
  } = useCtaVisibility();

  const [experienceTypes, setExperienceTypes] = useState<ReadonlySet<string>>(
    new Set(DEFAULT_EXPERIENCE_TYPES),
  );
  const [ambiance, setAmbiance] = useState<ReadonlySet<string>>(new Set(DEFAULT_AMBIANCE));
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [distance, setDistance] = useState(DEFAULT_DISTANCE);
  const [saving, setSaving] = useState(false);

  const tileWidth = (width - SCREEN_HORIZONTAL_PADDING - GRID_GAP) / 2;

  // Not `useCallback`, same reason as `ExperienceDetailScreen`'s own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule, and
  // `ScrollView.onScroll` identity doesn't need to be stable anyway.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
    ctaOnScroll(event.nativeEvent.contentOffset.y);
  }

  const toggleExperienceType = (id: string) =>
    setExperienceTypes((current) => {
      const updated = new Set(current);
      if (!updated.delete(id)) updated.add(id);
      return updated;
    });

  const toggleAmbiance = (id: string) =>
    setAmbiance((current) => {
      const updated = new Set(current);
      if (!updated.delete(id)) updated.add(id);
      return updated;
    });

  const handleReset = () => {
    setExperienceTypes(new Set(DEFAULT_EXPERIENCE_TYPES));
    setAmbiance(new Set(DEFAULT_AMBIANCE));
    setBudget(DEFAULT_BUDGET);
    setDistance(DEFAULT_DISTANCE);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await wait(SAVE_DELAY_MS);
      showToast('success', {
        title: t('preferences.saveSuccess.title'),
        message: t('preferences.saveSuccess.message'),
      });
      router.back();
    } catch {
      // `wait` never rejects today (no backend to fail against, docs/DECISIONS.md D-51) — this branch
      // is forward-compatible scaffolding for when a real save call can actually fail.
      setSaving(false);
      showToast('error', { title: t('preferences.saveError') });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="preferences-scroll"
        onScroll={handleScroll}
        onScrollEndDrag={ctaOnScrollEnd}
        onMomentumScrollEnd={ctaOnScrollEnd}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + STICKY_FOOTER_CLEARANCE,
          gap: 28,
        }}
      >
        <View className="gap-2">
          <Text variant="h2" accessibilityRole="header">
            {t('preferences.title')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('preferences.intro')}
          </Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text variant="h4">{t('preferences.experienceTypes.title')}</Text>
            <Text variant="small" tone="secondary">
              {t('preferences.experienceTypes.subtitle')}
            </Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {EXPERIENCE_TYPES.map((item) => (
              <InterestTile
                key={item.id}
                label={t(item.key)}
                icon={item.icon}
                iconColor={colors.text}
                selectedIconColor={colors.primaryForeground}
                iconSize={26}
                iconScale={item.iconScale}
                selected={experienceTypes.has(item.id)}
                width={tileWidth}
                height={TILE_HEIGHT}
                onPress={() => toggleExperienceType(item.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text variant="h4">{t('preferences.ambiance.title')}</Text>
            <Text variant="small" tone="secondary">
              {t('preferences.ambiance.subtitle')}
            </Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {AMBIANCE_OPTIONS.map((item) => (
              <InterestTile
                key={item.id}
                label={t(item.key)}
                icon={item.icon}
                iconColor={colors.text}
                selectedIconColor={colors.primaryForeground}
                iconSize={24}
                selected={ambiance.has(item.id)}
                width={tileWidth}
                height={TILE_HEIGHT}
                onPress={() => toggleAmbiance(item.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <View className="gap-1">
            <Text variant="h4">{t('preferences.budget.title')}</Text>
            <Text variant="small" tone="secondary">
              {t('preferences.budget.subtitle')}
            </Text>
          </View>
          <Text variant="h3" className="text-center">
            {t('preferences.budget.value', { amount: budget })}
          </Text>
          <Slider
            min={0}
            max={100}
            step={5}
            value={budget}
            onValueChange={setBudget}
            accessibilityLabel={t('preferences.budget.title')}
          />
          <View className="flex-row justify-between">
            <Text variant="caption" tone="secondary">
              {t('preferences.budget.min')}
            </Text>
            <Text variant="caption" tone="secondary">
              {t('preferences.budget.max')}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="gap-1">
            <Text variant="h4">{t('preferences.distance.title')}</Text>
            <Text variant="small" tone="secondary">
              {t('preferences.distance.subtitle')}
            </Text>
          </View>
          <Text variant="h3" className="text-center">
            {t('preferences.distance.value', { distance })}
          </Text>
          <Slider
            min={1}
            max={50}
            step={1}
            value={distance}
            onValueChange={setDistance}
            accessibilityLabel={t('preferences.distance.title')}
          />
          <View className="flex-row justify-between">
            <Text variant="caption" tone="secondary">
              {t('preferences.distance.min')}
            </Text>
            <Text variant="caption" tone="secondary">
              {t('preferences.distance.max')}
            </Text>
          </View>
        </View>
      </ScrollScreen>

      <StickyRevealHeader
        title={t('preferences.title')}
        scrollY={scrollY}
        revealOffset={HEADER_REVEAL_OFFSET}
        leftSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
          </Pressable>
        }
        rightSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('preferences.reset')}
            onPress={handleReset}
            hitSlop={8}
          >
            <Text variant="small" tone="primary" className="font-bodyMedium">
              {t('preferences.reset')}
            </Text>
          </Pressable>
        }
      />

      <StickyActionFooter
        visible={ctaVisible}
        label={t('preferences.save')}
        loading={saving}
        onPress={() => void handleSave()}
      />
    </View>
  );
}
