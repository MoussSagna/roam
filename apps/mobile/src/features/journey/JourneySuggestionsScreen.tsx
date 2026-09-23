import { useRouter } from 'expo-router';
import Compass from 'lucide-react-native/icons/compass';
import Route from 'lucide-react-native/icons/route';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  FadeInUp,
  STICKY_FOOTER_CLEARANCE,
  StickyActionFooter,
  Text,
} from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience } from '@/types';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { SuggestionCard } from './components/SuggestionCard';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { useLeaveCreation } from './hooks/useLeaveCreation';
import { useJourneyDraft } from './JourneyDraftContext';
import {
  defaultSelection,
  suggestForJourney,
  toSuggestion,
  type JourneySuggestion,
} from './lib/suggest';

/**
 * Journey creation 4/6 — suggestions (`/journey/create/suggestions`), the heart of the flow: ROAM's
 * picks for the chosen context (`suggestForJourney` over the existing experience pool — the same
 * deterministic, explainable recommendation approach as Home, no second system), a few pre-selected.
 * Cards can be added / removed and opened. "Explorer d'autres idées" opens Search on top of the flow,
 * so the draft is still here on the way back.
 */
export function JourneySuggestionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const { experiences, byId, isLoading, error, retry, categoryLabelFor } = useJourneyExperiences();
  const { context, startLocation, duration, selectionInitialized, initializeSelection } = draft;

  const result = useMemo(() => {
    if (!context || !startLocation || isLoading || error) return null;
    const ranked = suggestForJourney(experiences, context, startLocation);
    // An experience the flow was opened from (or picked earlier) is always shown.
    const extra = draft.experienceIds
      .filter((id) => !ranked.suggestions.some((item) => item.experience.id === id))
      .map((id) => byId.get(id))
      .filter((experience): experience is Experience => experience !== undefined)
      .map((experience) => toSuggestion(experience, context, startLocation));
    return { ...ranked, suggestions: [...extra, ...ranked.suggestions] };
  }, [context, startLocation, isLoading, error, experiences, byId, draft.experienceIds]);

  // First arrival: pre-select ROAM's picks (kept as edited when coming back to this screen).
  useEffect(() => {
    if (result && duration && !selectionInitialized) {
      initializeSelection(defaultSelection(result.suggestions, duration));
    }
  }, [result, duration, selectionInitialized, initializeSelection]);

  const count = draft.experienceIds.length;
  const subtitle =
    count === 0
      ? t('journey.suggestions.subtitleNone')
      : count === 1
        ? t('journey.suggestions.subtitleOne')
        : t('journey.suggestions.subtitleMany', { count });

  const reasonText = (item: JourneySuggestion) =>
    item.reason === 'mood' && context
      ? t('journey.suggestions.reasonMood', { mood: t(`journey.moodAdjectives.${context.mood}`) })
      : item.reason === 'nearby'
        ? t('journey.suggestions.reasonNearby')
        : t('journey.suggestions.reasonBudget');

  const openExperience = (experience: Experience) =>
    router.push({ pathname: '/experience/[id]', params: { id: experience.id } });

  const header = (
    <FadeInUp style={{ gap: 8, paddingBottom: 20 }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 30, lineHeight: 36 }}
        className="text-text"
      >
        {t('journey.suggestions.title')}
      </Text>
      <Text variant="body" tone="secondary">
        {subtitle}
      </Text>
      {result?.relaxed ? (
        <View className="mt-2 rounded-large bg-accent/25 px-4 py-3">
          <Text variant="small">{t('journey.suggestions.relaxed')}</Text>
        </View>
      ) : null}
    </FadeInUp>
  );

  const footer = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('journey.suggestions.explore')}
      onPress={() => router.push('/search')}
      className="mt-6 flex-row items-center justify-center gap-2 py-3 active:opacity-60"
    >
      <Compass size={18} strokeWidth={1.8} color={colors.primary} />
      <Text variant="body" tone="primary" className="font-bodyMedium">
        {t('journey.suggestions.explore')}
      </Text>
    </Pressable>
  );

  let body;
  if (!context || !startLocation || isLoading) {
    body = (
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  } else if (error) {
    body = (
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text variant="body" tone="secondary" className="text-center">
          {t('journey.suggestions.error')}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={retry} />
      </View>
    );
  } else if (!result || result.suggestions.length === 0) {
    body = (
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text variant="h4" className="text-center">
          {t('journey.suggestions.emptyTitle')}
        </Text>
        <Text variant="body" tone="secondary" className="text-center">
          {t('journey.suggestions.emptySubtitle')}
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        testID="journey-suggestions-list"
        data={result.suggestions}
        keyExtractor={(item) => item.experience.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: STICKY_FOOTER_CLEARANCE + 16,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <FadeInUp delay={Math.min(index, 4) * 80}>
            <SuggestionCard
              experience={item.experience}
              categoryLabel={categoryLabelFor(item.experience)}
              distanceM={item.distanceM}
              reason={reasonText(item)}
              selected={draft.experienceIds.includes(item.experience.id)}
              onToggle={draft.toggleExperience}
              onOpen={openExperience}
            />
          </FadeInUp>
        )}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={() => router.back()} onClose={requestLeave} step={4} />
        </View>
        {body}
      </SafeAreaView>

      <StickyActionFooter
        visible={!!result && result.suggestions.length > 0}
        label={t('journey.suggestions.build')}
        icon={Route}
        disabled={count === 0}
        onPress={() => router.push('/journey/create/builder')}
      />
      {quitModal}
    </View>
  );
}
