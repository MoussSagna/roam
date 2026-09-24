import { useRouter } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import LogOut from 'lucide-react-native/icons/log-out';
import MapIcon from 'lucide-react-native/icons/map';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ConfirmationModal,
  FadeInUp,
  STICKY_FOOTER_CLEARANCE,
  StickyActionFooter,
  Text,
} from '@/components/ui';
import { showToast } from '@/lib/toast';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience } from '@/types';

import type { JourneyStepState } from './components/JourneyStepCard';
import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { JourneyStats } from './components/JourneyStats';
import { JourneyTimeline } from './components/JourneyTimeline';
import { SuggestionCard } from './components/SuggestionCard';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { findJourney, updateJourneySteps, useJourney } from './journeyStore';
import { formatBudget, formatDistance, formatDuration } from './lib/format';
import { buildPlan } from './lib/plan';
import { currentStepAfterEdit } from './lib/progress';
import { suggestForJourney } from './lib/suggest';

type JourneyEditScreenProps = {
  journeyId?: string;
};

/**
 * Editing the journey in progress (`/journey/[id]/edit`, sprint 12, D-86), opened by "Modifier" on
 * `/journey/[id]`. The builder's look and pieces — `JourneyTimeline` (move up / down, remove), the
 * totals (`JourneyStats`, recomputed live by `buildPlan`) — over a LOCAL copy of the steps: the saved
 * journey only changes on "Enregistrer" (`updateJourneySteps`: same journey, still `active`, progress
 * kept). "+ Ajouter une expérience" opens ROAM's suggestions for the journey's own context right here
 * (`suggestForJourney` + `SuggestionCard`, as in the creation flow).
 *
 * The CTA follows the edits: untouched → "Continuer mon parcours" (back to the journey), changed →
 * "Enregistrer" (save, toast, back). Back with changes asks "Quitter sans enregistrer ?" first.
 */
export function JourneyEditScreen({ journeyId }: JourneyEditScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const journeys = useJourney();
  const journey = findJourney(journeys, journeyId);
  const {
    experiences,
    byId,
    categoryLabelFor,
    isLoading: experiencesLoading,
  } = useJourneyExperiences();

  // `null` until the first edit: the saved steps are shown as they are.
  const [editedIds, setEditedIds] = useState<string[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [quitVisible, setQuitVisible] = useState(false);
  const [quitConfirmed, setQuitConfirmed] = useState(false);

  const savedIds = useMemo(() => journey?.steps.map((step) => step.experienceId) ?? [], [journey]);
  const ids = editedIds ?? savedIds;
  const dirty = editedIds !== null && editedIds.join('|') !== savedIds.join('|');

  const ordered = useMemo(
    () =>
      ids
        .map((id) => byId.get(id))
        .filter((experience): experience is Experience => experience !== undefined),
    [ids, byId],
  );
  const plan = useMemo(
    () => (journey ? buildPlan(ordered, journey.startLocation, journey.startTime) : null),
    [ordered, journey],
  );
  const suggestions = useMemo(() => {
    if (!journey || !showSuggestions) return [];
    return suggestForJourney(
      experiences,
      journey.context,
      journey.startLocation,
    ).suggestions.filter((item) => !ids.includes(item.experience.id));
  }, [journey, showSuggestions, experiences, ids]);

  const edit = (next: string[]) => setEditedIds(next);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    edit(next);
  };
  const remove = (index: number) => edit(ids.filter((_, i) => i !== index));
  const add = (id: string) => {
    if (!ids.includes(id)) edit([...ids, id]);
  };

  const backToJourney = () => {
    if (router.canGoBack()) router.back();
    else if (journeyId) router.replace({ pathname: '/journey/[id]', params: { id: journeyId } });
  };
  const requestBack = () => (dirty ? setQuitVisible(true) : backToJourney());
  const openExperience = (experience: Experience) =>
    router.push({ pathname: '/experience/[id]', params: { id: experience.id } });

  const save = async () => {
    if (!journey || !dirty || ids.length === 0 || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await updateJourneySteps(journey.id, ids);
      showToast('success', {
        title: t('journey.edit.savedTitle'),
        message: t('journey.edit.savedMessage'),
      });
      backToJourney();
    } catch {
      showToast('error', { title: t('journey.edit.saveError') });
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (journeys.isLoading || experiencesLoading || !journey || journey.status !== 'active') {
    const message =
      journeys.isLoading || experiencesLoading
        ? t('common.loading')
        : journeys.error
          ? t('journey.active.error')
          : t('journey.active.notFound');
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }} className="px-6">
          <JourneyFlowHeader onBack={backToJourney} />
          <View className="flex-1 items-center justify-center">
            <Text variant="body" tone="secondary" className="text-center">
              {message}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentIndex = currentStepAfterEdit(journey, ids);
  const stateFor = (index: number): JourneyStepState => {
    if (!journey.startedAt) return 'upcoming';
    if (index < currentIndex) return 'done';
    return index === currentIndex ? 'current' : 'upcoming';
  };
  const isEmpty = ordered.length === 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={requestBack} />
        </View>

        <ScrollView
          testID="journey-edit-scroll"
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: STICKY_FOOTER_CLEARANCE + 16,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp style={{ gap: 16 }}>
            <View className="gap-2">
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 32, lineHeight: 38 }}
                className="text-text"
              >
                {t('journey.edit.title')}
              </Text>
              <Text variant="body" tone="secondary">
                {t('journey.edit.subtitle')}
              </Text>
            </View>
            {plan && !isEmpty ? (
              <JourneyStats
                stats={[
                  {
                    icon: Clock,
                    value: formatDuration(plan.estimatedDurationMin),
                    label: t('journey.stats.duration'),
                  },
                  {
                    icon: MapIcon,
                    value: formatDistance(plan.totalDistanceM, i18n.language),
                    label: t('journey.stats.distance'),
                  },
                  {
                    icon: Coins,
                    value: formatBudget(plan.estimatedBudgetEur),
                    label: t('journey.stats.budget'),
                  },
                ]}
              />
            ) : null}
          </FadeInUp>

          {isEmpty ? (
            <View className="items-center gap-2 rounded-card border border-dashed border-border px-6 py-10">
              <Text variant="h4" className="text-center">
                {t('journey.builder.emptyTitle')}
              </Text>
              <Text variant="body" tone="secondary" className="text-center">
                {t('journey.builder.emptySubtitle')}
              </Text>
            </View>
          ) : plan ? (
            <JourneyTimeline
              steps={plan.steps}
              experiencesById={byId}
              categoryLabelFor={categoryLabelFor}
              onPressExperience={openExperience}
              stateFor={stateFor}
              onMove={move}
              onRemove={remove}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('journey.builder.addExperience')}
            accessibilityState={{ expanded: showSuggestions }}
            onPress={() => setShowSuggestions((value) => !value)}
            className="flex-row items-center justify-center gap-2 rounded-card border border-dashed border-primary py-4 active:opacity-70"
          >
            <Plus size={18} strokeWidth={2} color={colors.primary} />
            <Text variant="body" tone="primary" className="font-bodySemibold">
              {t('journey.builder.addExperience')}
            </Text>
          </Pressable>

          {showSuggestions ? (
            <FadeInUp style={{ gap: 12 }}>
              <Text variant="h4">{t('journey.edit.suggestionsTitle')}</Text>
              {suggestions.length === 0 ? (
                <Text variant="body" tone="secondary">
                  {t('journey.edit.noSuggestions')}
                </Text>
              ) : (
                <View testID="journey-edit-suggestions" className="gap-4">
                  {suggestions.map((item) => (
                    <SuggestionCard
                      key={item.experience.id}
                      experience={item.experience}
                      categoryLabel={categoryLabelFor(item.experience)}
                      distanceM={item.distanceM}
                      reason={
                        item.reason === 'mood'
                          ? t('journey.suggestions.reasonMood', {
                              mood: t(`journey.moodAdjectives.${journey.context.mood}`),
                            })
                          : item.reason === 'nearby'
                            ? t('journey.suggestions.reasonNearby')
                            : t('journey.suggestions.reasonBudget')
                      }
                      selected={false}
                      onToggle={add}
                      onOpen={openExperience}
                    />
                  ))}
                </View>
              )}
            </FadeInUp>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <StickyActionFooter
        visible
        label={dirty ? t('journey.edit.save') : t('journey.active.continue')}
        icon={dirty ? Check : ArrowRight}
        loading={saving}
        disabled={dirty && isEmpty}
        onPress={() => (dirty ? void save() : backToJourney())}
      />

      <ConfirmationModal
        visible={quitVisible}
        title={t('journey.edit.quitTitle')}
        description={t('journey.edit.quitDescription')}
        confirmLabel={t('journey.edit.quitLeave')}
        cancelLabel={t('journey.edit.quitStay')}
        variant="destructive"
        icon={LogOut}
        onConfirm={() => {
          setQuitConfirmed(true);
          setQuitVisible(false);
        }}
        onCancel={() => setQuitVisible(false)}
        onExited={() => {
          // Leave once the dialog is gone (D-78); the local edits are dropped with the screen.
          if (quitConfirmed) backToJourney();
          setQuitConfirmed(false);
        }}
      />
    </View>
  );
}
