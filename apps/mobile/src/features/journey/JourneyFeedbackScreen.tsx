import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  ConfirmationModal,
  FadeInUp,
  STICKY_FOOTER_CLEARANCE,
  StickyActionFooter,
  Text,
} from '@/components/ui';
import { SuccessCheckmark } from '@/features/auth/components/SuccessCheckmark';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { showToast } from '@/lib/toast';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience, JourneyFeedback, JourneyRating } from '@/types';

import { FeedbackCommentField } from './components/FeedbackCommentField';
import { StarRating } from './components/StarRating';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  submitJourneyFeedback,
  useJourneyFeedback,
} from './journeyFeedback';
import { findJourney, useJourney } from './journeyStore';
import { formatDuration } from './lib/format';

type JourneyFeedbackScreenProps = {
  journeyId?: string;
};

const HERO_HEIGHT = 280;
const SHEET_OVERLAP = 24;
const BADGE = 56;
const MAX_TILES = 3;

const RATING_LABEL_KEYS = {
  1: 'journey.feedback.rating1',
  2: 'journey.feedback.rating2',
  3: 'journey.feedback.rating3',
  4: 'journey.feedback.rating4',
  5: 'journey.feedback.rating5',
} as const;

/**
 * Feedback after a journey (`/journey/[id]/feedback`, sprint 12) — opened by "Terminer mon parcours"
 * once the journey is `completed`, never by just opening a journey. After the "14 — Feedback"
 * reference: an edge-to-edge photo ("Alors, comment c'était ?", "Passer"), then the journey recap
 * (check badge, title, steps), five stars, an optional comment and "Envoyer mon avis" (disabled until
 * a star is chosen). The thank-you is shown in place, like the reference's closing line — no extra
 * screen — with "Voir mon parcours" / "Retour à mes parcours". Feedback already given shows that recap
 * instead of a second form; an unfinished journey gets no form at all.
 */
export function JourneyFeedbackScreen({ journeyId }: JourneyFeedbackScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);

  const journeys = useJourney();
  const journey = findJourney(journeys, journeyId);
  const { byId, categoryLabelFor, isLoading: experiencesLoading } = useJourneyExperiences();
  const saved = useJourneyFeedback(journeyId);

  const [rating, setRating] = useState<JourneyRating | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [justSent, setJustSent] = useState(false);
  const [skipConfirmVisible, setSkipConfirmVisible] = useState(false);
  const [skipConfirmed, setSkipConfirmed] = useState(false);

  const experiences = useMemo(
    () =>
      (journey?.steps ?? [])
        .map((step) => byId.get(step.experienceId))
        .filter((experience): experience is Experience => experience !== undefined),
    [journey, byId],
  );

  const viewJourney = () => {
    if (router.canGoBack()) router.back();
    else if (journeyId) router.replace({ pathname: '/journey/[id]', params: { id: journeyId } });
  };
  const backToJourneys = () => router.navigate('/journey');

  const hasInput = rating !== null || comment.trim().length > 0;
  const requestSkip = () => (hasInput ? setSkipConfirmVisible(true) : viewJourney());

  const submit = async () => {
    if (!journeyId || rating === null || submittingRef.current || saved.feedback) return;
    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      const feedback = await submitJourneyFeedback({ journeyId, rating, comment });
      saved.setFeedback(feedback);
      setJustSent(true);
      scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
    } catch {
      showToast('error', {
        title: t('journey.feedback.errorTitle'),
        message: t('journey.feedback.errorMessage'),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const loading = journeys.isLoading || saved.isLoading || experiencesLoading;

  // Loading / error / unknown / unfinished: a plain page with a way back, no form.
  if (loading || journeys.error || saved.error || !journey || journey.status !== 'completed') {
    const message = loading
      ? t('common.loading')
      : journeys.error || saved.error
        ? t('journey.active.error')
        : !journey
          ? t('journey.active.notFound')
          : t('journey.feedback.notCompleted');
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }} className="px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={viewJourney}
            hitSlop={12}
            className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
          </Pressable>
          <View className="flex-1 items-center justify-center gap-4">
            <Text variant="body" tone="secondary" className="text-center">
              {message}
            </Text>
            {journeys.error || saved.error ? (
              <Button
                label={t('common.retry')}
                variant="secondary"
                onPress={() => (journeys.error ? void journeys.reload() : saved.retry())}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const feedback: JourneyFeedback | null = saved.feedback;
  const phase = feedback ? (justSent ? 'sent' : 'already') : 'form';
  const cover = experiences.at(-1)?.coverImage ?? experiences[0]?.coverImage;
  const count = journey.steps.length;
  const meta = [
    t('journey.active.completedTitle'),
    count === 1 ? t('journey.hub.experienceCountOne') : t('journey.hub.experienceCount', { count }),
    formatDuration(journey.estimatedDurationMin),
  ].join(' · ');
  const tileWidth = (width - 48 - 12 * (MAX_TILES - 1)) / MAX_TILES;

  return (
    <View className="flex-1 bg-background">
      {isFocused ? <StatusBar style="light" /> : null}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          testID="journey-feedback-scroll"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: phase === 'form' ? STICKY_FOOTER_CLEARANCE + 24 : insets.bottom + 32,
          }}
        >
          {/* Hero: edge to edge, from the very top. */}
          <View style={{ height: insets.top + HERO_HEIGHT }}>
            <View className="absolute inset-0 bg-surfaceElevated">
              {cover ? (
                <Image
                  source={cover}
                  style={{ flex: 1 }}
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
            </View>
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']}
              locations={[0, 0.4, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />
            {phase === 'form' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('journey.feedback.skip')}
                onPress={requestSkip}
                hitSlop={8}
                className="absolute right-6 rounded-pill bg-black/35 px-4 py-2 active:opacity-70"
                style={{ top: insets.top + 12 }}
              >
                <Text variant="label" className="text-white">
                  {t('journey.feedback.skip')}
                </Text>
              </Pressable>
            ) : null}
            <View
              className="absolute inset-x-0 bottom-0 gap-2 px-6"
              style={{ paddingBottom: SHEET_OVERLAP + 24 }}
            >
              <Text
                variant="caption"
                className="font-bodySemibold uppercase tracking-[2px] text-white/80"
              >
                {t('journey.feedback.eyebrow')}
              </Text>
              <Text
                accessibilityRole="header"
                className="text-white"
                style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 34, lineHeight: 40 }}
              >
                {t('journey.feedback.heroTitle')}
              </Text>
              <Text variant="body" className="text-white/90">
                {t('journey.feedback.heroSubtitle')}
              </Text>
            </View>
          </View>

          {/* Content sheet: rides over the photo, page padding, no border. */}
          <View
            className="gap-6 rounded-t-hero bg-background px-6"
            style={{ marginTop: -SHEET_OVERLAP }}
          >
            <View className="items-center gap-2">
              {phase === 'form' ? (
                <View
                  className="items-center justify-center rounded-pill border-4 border-background bg-primary"
                  style={{ width: BADGE, height: BADGE, marginTop: -BADGE / 2 }}
                >
                  <Check size={26} strokeWidth={2.5} color={colors.primaryForeground} />
                </View>
              ) : (
                <View style={{ marginTop: -36 }}>
                  <SuccessCheckmark reduceMotion={reduceMotion || phase === 'already'} />
                </View>
              )}
              <Text
                className="text-center text-text"
                style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 26, lineHeight: 32 }}
              >
                {journey.title}
              </Text>
              <Text variant="small" tone="secondary" className="text-center">
                {meta}
              </Text>
            </View>

            {phase === 'form' && experiences.length > 0 ? (
              <FadeInUp delay={80}>
                <View className="flex-row" style={{ gap: 12 }}>
                  {journey.steps.slice(0, MAX_TILES).map((step) => {
                    const experience = byId.get(step.experienceId);
                    if (!experience) return null;
                    return (
                      <View
                        key={step.experienceId}
                        style={{ width: tileWidth }}
                        className="gap-1.5"
                      >
                        <View
                          className="overflow-hidden rounded-large bg-surfaceElevated"
                          style={{ width: tileWidth, height: tileWidth }}
                        >
                          {experience.coverImage ? (
                            <Image
                              source={experience.coverImage}
                              style={{ flex: 1 }}
                              contentFit="cover"
                            />
                          ) : null}
                        </View>
                        <Text variant="caption" className="font-bodySemibold" numberOfLines={1}>
                          {experience.title}
                        </Text>
                        <Text variant="caption" tone="secondary" numberOfLines={1}>
                          {[categoryLabelFor(experience), step.estimatedArrival]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </FadeInUp>
            ) : null}

            {phase === 'form' ? (
              <>
                <View className="h-px bg-border" />
                <FadeInUp delay={160} style={{ gap: 16 }}>
                  <View className="gap-1">
                    <Text variant="h3" className="text-center">
                      {t('journey.feedback.ratingTitle')}
                    </Text>
                    <Text variant="body" tone="secondary" className="text-center">
                      {t('journey.feedback.ratingSubtitle')}
                    </Text>
                  </View>
                  <StarRating value={rating} onChange={setRating} />
                  <View className="items-center" accessibilityLiveRegion="polite">
                    {rating ? (
                      <>
                        <Text variant="label">{t('journey.feedback.ratingValue', { rating })}</Text>
                        <Text variant="body" tone="secondary">
                          {t(RATING_LABEL_KEYS[rating])}
                        </Text>
                      </>
                    ) : (
                      <Text variant="small" tone="secondary">
                        {t('journey.feedback.ratingHint')}
                      </Text>
                    )}
                  </View>
                </FadeInUp>
                <FadeInUp delay={240}>
                  <FeedbackCommentField
                    value={comment}
                    onChangeText={setComment}
                    maxLength={FEEDBACK_COMMENT_MAX_LENGTH}
                    onFocus={() =>
                      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)
                    }
                  />
                </FadeInUp>
              </>
            ) : feedback ? (
              <FadeInUp key={phase} style={{ gap: 20 }}>
                <View className="items-center gap-2" accessibilityLiveRegion="polite">
                  <Text variant="h3" accessibilityRole="header" className="text-center">
                    {phase === 'sent'
                      ? t('journey.feedback.thanksTitle')
                      : t('journey.feedback.alreadyTitle')}
                  </Text>
                  <Text variant="body" tone="secondary" className="text-center">
                    {phase === 'sent'
                      ? t('journey.feedback.thanksSubtitle')
                      : t('journey.feedback.alreadySubtitle')}
                  </Text>
                </View>
                <View
                  testID="feedback-recap"
                  className="items-center gap-3 rounded-card bg-surface p-5"
                >
                  <StarRating value={feedback.rating} size={26} />
                  <Text variant="label">
                    {t('journey.feedback.ratingValue', { rating: feedback.rating })} ·{' '}
                    {t(RATING_LABEL_KEYS[feedback.rating])}
                  </Text>
                  {feedback.comment ? (
                    <Text variant="body" tone="secondary" className="text-center italic">
                      « {feedback.comment} »
                    </Text>
                  ) : null}
                </View>
                <View className="gap-3">
                  <Button label={t('journey.feedback.viewJourney')} onPress={viewJourney} />
                  <Button
                    label={t('journey.feedback.backToJourneys')}
                    variant="secondary"
                    onPress={backToJourneys}
                  />
                </View>
              </FadeInUp>
            ) : null}
          </View>
        </ScrollView>

        {phase === 'form' ? (
          <StickyActionFooter
            visible
            label={t('journey.feedback.submit')}
            icon={ArrowRight}
            disabled={rating === null}
            loading={submitting}
            onPress={() => void submit()}
          />
        ) : null}
      </KeyboardAvoidingView>

      <ConfirmationModal
        visible={skipConfirmVisible}
        title={t('journey.feedback.skipConfirmTitle')}
        description={t('journey.feedback.skipConfirmDescription')}
        confirmLabel={t('journey.feedback.skipConfirmLeave')}
        cancelLabel={t('journey.feedback.skipConfirmStay')}
        onConfirm={() => {
          setSkipConfirmed(true);
          setSkipConfirmVisible(false);
        }}
        onCancel={() => setSkipConfirmVisible(false)}
        onExited={() => {
          // Navigate once the dialog is gone (D-78).
          if (skipConfirmed) viewJourney();
          setSkipConfirmed(false);
        }}
      />
    </View>
  );
}
