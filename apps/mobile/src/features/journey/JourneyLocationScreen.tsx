import { useRouter } from 'expo-router';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import MapIcon from 'lucide-react-native/icons/map';
import MapPin from 'lucide-react-native/icons/map-pin';
import Navigation from 'lucide-react-native/icons/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, FadeInUp, Text, TextField } from '@/components/ui';
import { ChoiceRow } from '@/features/onboarding/components/ChoiceRow';
import { DEFAULT_REGION } from '@/features/map/lib/region';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { JourneyStartKind, JourneyStartLocation } from '@/types';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { JourneyMapPreview } from './components/JourneyMapPreview';
import { START_SPOTS } from './data/startSpots';
import { useLeaveCreation } from './hooks/useLeaveCreation';
import { useJourneyDraft } from './JourneyDraftContext';

/** No geolocation exists in the app yet (no permission, no `expo-location`): "my position" and a typed
 * address resolve to central Paris, the map's own default — said on screen, never pretended. */
const APPROXIMATE_POSITION = {
  latitude: DEFAULT_REGION.latitude,
  longitude: DEFAULT_REGION.longitude,
};

const MIN_ADDRESS_LENGTH = 3;

/**
 * Journey creation 3/6 — starting point (`/journey/create/location`): my position, a place (a short
 * list of well-known spots) or an address. A small static `RoamMap` shows the chosen point.
 */
export function JourneyLocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const [kind, setKind] = useState<JourneyStartKind | null>(draft.startLocation?.kind ?? null);
  const [address, setAddress] = useState(
    draft.startLocation?.kind === 'address' ? draft.startLocation.label : '',
  );

  const chooseCurrent = () => {
    setKind('current');
    draft.setStartLocation({
      kind: 'current',
      label: t('journey.location.currentLabel'),
      coordinates: APPROXIMATE_POSITION,
    });
  };

  const choosePlace = (spot: (typeof START_SPOTS)[number]) => {
    draft.setStartLocation({ kind: 'place', label: spot.label, coordinates: spot.coordinates });
  };

  const addressLocation = (): JourneyStartLocation => ({
    kind: 'address',
    label: address.trim(),
    coordinates: APPROXIMATE_POSITION,
  });

  const canContinue =
    kind === 'address'
      ? address.trim().length >= MIN_ADDRESS_LENGTH
      : kind !== null && draft.startLocation?.kind === kind;

  const goNext = () => {
    if (kind === 'address') draft.setStartLocation(addressLocation());
    // "On prépare ton parcours" first (sprint 12, D-84); it replaces itself with the suggestions.
    router.push('/journey/create/building');
  };

  const preview =
    kind === 'address'
      ? address.trim().length >= MIN_ADDRESS_LENGTH
        ? addressLocation()
        : null
      : draft.startLocation?.kind === kind
        ? draft.startLocation
        : null;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={() => router.back()} onClose={requestLeave} step={3} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
            gap: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp style={{ gap: 8 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 30, lineHeight: 36 }}
              className="text-text"
            >
              {t('journey.location.title')}
            </Text>
            <Text variant="body" tone="secondary">
              {t('journey.location.subtitle')}
            </Text>
          </FadeInUp>

          <View accessibilityRole="radiogroup" className="gap-3">
            <ChoiceRow
              label={t('journey.location.current')}
              icon={Navigation}
              iconColor={colors.primary}
              selectedIconColor={colors.primaryForeground}
              iconSize={24}
              slotWidth={32}
              selected={kind === 'current'}
              height={60}
              onPress={chooseCurrent}
            />
            <ChoiceRow
              label={t('journey.location.place')}
              icon={MapPin}
              iconColor={colors.primary}
              selectedIconColor={colors.primaryForeground}
              iconSize={24}
              slotWidth={32}
              selected={kind === 'place'}
              height={60}
              onPress={() => setKind('place')}
            />
            <ChoiceRow
              label={t('journey.location.address')}
              icon={MapIcon}
              iconColor={colors.primary}
              selectedIconColor={colors.primaryForeground}
              iconSize={24}
              slotWidth={32}
              selected={kind === 'address'}
              height={60}
              onPress={() => setKind('address')}
            />
          </View>

          {kind === 'current' ? (
            <Text variant="small" tone="secondary">
              {t('journey.location.currentHint')}
            </Text>
          ) : null}

          {kind === 'place' ? (
            <FadeInUp style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {START_SPOTS.map((spot) => (
                <Chip
                  key={spot.id}
                  label={spot.label}
                  selected={
                    draft.startLocation?.kind === 'place' &&
                    draft.startLocation.label === spot.label
                  }
                  onPress={() => choosePlace(spot)}
                />
              ))}
            </FadeInUp>
          ) : null}

          {kind === 'address' ? (
            <FadeInUp style={{ gap: 6 }}>
              <TextField
                label={t('journey.location.addressLabel')}
                icon={LocateFixed}
                value={address}
                onChangeText={setAddress}
                placeholder={t('journey.location.addressPlaceholder')}
                autoCapitalize="words"
                returnKeyType="done"
              />
              <Text variant="small" tone="secondary">
                {t('journey.location.currentHint')}
              </Text>
            </FadeInUp>
          ) : null}

          {preview ? (
            <View className="overflow-hidden rounded-large">
              <JourneyMapPreview experiences={[]} start={preview} height={160} />
            </View>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-4 pt-2">
          <Button label={t('journey.continue')} onPress={goNext} disabled={!canContinue} />
        </View>
      </SafeAreaView>
      {quitModal}
    </View>
  );
}
