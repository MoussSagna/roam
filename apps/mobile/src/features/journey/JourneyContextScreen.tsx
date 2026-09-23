import { useRouter } from 'expo-router';
import Bike from 'lucide-react-native/icons/bike';
import Clock1 from 'lucide-react-native/icons/clock-1';
import Clock2 from 'lucide-react-native/icons/clock-2';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Coffee from 'lucide-react-native/icons/coffee';
import Coins from 'lucide-react-native/icons/coins';
import Compass from 'lucide-react-native/icons/compass';
import Gem from 'lucide-react-native/icons/gem';
import Gift from 'lucide-react-native/icons/gift';
import Heart from 'lucide-react-native/icons/heart';
import Landmark from 'lucide-react-native/icons/landmark';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Sun from 'lucide-react-native/icons/sun';
import SunMedium from 'lucide-react-native/icons/sun-medium';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import Wallet from 'lucide-react-native/icons/wallet';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { ChoiceRow } from '@/features/onboarding/components/ChoiceRow';
import { MoodTile } from '@/features/onboarding/components/MoodTile';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { JourneyBudget, JourneyDuration, JourneyMood } from '@/types';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { useLeaveCreation } from './hooks/useLeaveCreation';
import { useJourneyDraft } from './JourneyDraftContext';

const MOODS: readonly { value: JourneyMood; icon: typeof Coffee; warm?: boolean }[] = [
  { value: 'calm', icon: Coffee },
  { value: 'discover', icon: Compass },
  { value: 'food', icon: UtensilsCrossed },
  { value: 'culture', icon: Landmark },
  { value: 'energetic', icon: Bike },
  { value: 'romantic', icon: Heart, warm: true },
  { value: 'festive', icon: PartyPopper, warm: true },
];

const DURATIONS: readonly { value: JourneyDuration; icon: typeof Clock1 }[] = [
  { value: '1h', icon: Clock1 },
  { value: '2h', icon: Clock2 },
  { value: '3h', icon: Clock3 },
  { value: 'halfDay', icon: SunMedium },
  { value: 'day', icon: Sun },
];

const BUDGETS: readonly { value: JourneyBudget; icon: typeof Gift }[] = [
  { value: 'free', icon: Gift },
  { value: 'low', icon: Coins },
  { value: 'medium', icon: Wallet },
  { value: 'high', icon: Gem },
];

/** Context questions, asked one at a time (flow steps 0–2). */
type Question = 0 | 1 | 2;

/**
 * Journey creation 2/6 — context (`/journey/create/context`). Three questions, one per view, with the
 * onboarding's own selection components (`MoodTile` grid, `ChoiceRow` list) and progress bars, so it
 * reads like the rest of ROAM rather than a form. "Continuer" moves to the next question; back goes to
 * the previous one before leaving the screen.
 */
export function JourneyContextScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const [question, setQuestion] = useState<Question>(0);

  const answered = [draft.mood, draft.duration, draft.budget][question] !== null;
  const tileWidth = (width - 48 - 12) / 2;

  const goBack = () => {
    if (question > 0) setQuestion((question - 1) as Question);
    else router.back();
  };

  const goNext = () => {
    if (question < 2) setQuestion((question + 1) as Question);
    else router.push('/journey/create/location');
  };

  const title = [
    t('journey.context.moodTitle'),
    t('journey.context.durationTitle'),
    t('journey.context.budgetTitle'),
  ][question];

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={goBack} onClose={requestLeave} step={question} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Keyed by question: each one fades/rises in as its own view. */}
          <FadeInUp key={question} style={{ gap: 24 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 30, lineHeight: 36 }}
              className="text-text"
            >
              {title}
            </Text>

            {question === 0 ? (
              <View
                accessibilityRole="radiogroup"
                className="flex-row flex-wrap"
                style={{ gap: 12 }}
              >
                {MOODS.map(({ value, icon, warm }) => (
                  <MoodTile
                    key={value}
                    label={t(`journey.moods.${value}`)}
                    icon={icon}
                    iconColor={colors.primary}
                    selectedIconColor={colors.primaryForeground}
                    iconSize={28}
                    warm={warm}
                    selected={draft.mood === value}
                    width={tileWidth}
                    height={92}
                    onPress={() => draft.setMood(value)}
                  />
                ))}
              </View>
            ) : null}

            {question === 1 ? (
              <View accessibilityRole="radiogroup" className="gap-3">
                {DURATIONS.map(({ value, icon }) => (
                  <ChoiceRow
                    key={value}
                    label={t(`journey.durations.${value}`)}
                    icon={icon}
                    iconColor={colors.primary}
                    selectedIconColor={colors.primaryForeground}
                    iconSize={26}
                    slotWidth={32}
                    selected={draft.duration === value}
                    height={60}
                    onPress={() => draft.setDuration(value)}
                  />
                ))}
              </View>
            ) : null}

            {question === 2 ? (
              <View accessibilityRole="radiogroup" className="gap-3">
                {BUDGETS.map(({ value, icon }) => (
                  <ChoiceRow
                    key={value}
                    label={t(`journey.budgets.${value}`)}
                    accessibilityLabel={t(`journey.budgetNames.${value}`)}
                    icon={icon}
                    iconColor={colors.primary}
                    selectedIconColor={colors.primaryForeground}
                    iconSize={26}
                    slotWidth={32}
                    selected={draft.budget === value}
                    height={60}
                    onPress={() => draft.setBudget(value)}
                  />
                ))}
              </View>
            ) : null}
          </FadeInUp>
        </ScrollView>

        <View className="px-6 pb-4 pt-2">
          <Button label={t('journey.continue')} onPress={goNext} disabled={!answered} />
        </View>
      </SafeAreaView>
      {quitModal}
    </View>
  );
}
