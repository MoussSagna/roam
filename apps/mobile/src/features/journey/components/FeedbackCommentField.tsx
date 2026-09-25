import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

type FeedbackCommentFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  onFocus?: () => void;
};

/**
 * "Un petit mot ? (optionnel)" (sprint 12, the journey feedback): a multiline field with a focus state
 * and a "58/300" counter. Not `TextField`: that one is the auth screens' single-line field with a
 * required icon and no focus state, and giving it one would change those validated screens.
 */
export function FeedbackCommentField({
  value,
  onChangeText,
  maxLength,
  onFocus,
}: FeedbackCommentFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const label = t('journey.feedback.commentTitle');

  return (
    <View className="gap-2">
      <Text variant="h4">
        {label}{' '}
        <Text variant="body" tone="secondary">
          {t('journey.feedback.optional')}
        </Text>
      </Text>
      <View
        testID="feedback-comment-box"
        className={cx(
          'rounded-large border bg-surface px-4 py-3',
          focused ? 'border-primary' : 'border-border',
        )}
      >
        <TextInput
          testID="feedback-comment"
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          placeholder={t('journey.feedback.commentPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          className="font-body text-body text-text"
          style={{ minHeight: 112, paddingVertical: 0 }}
        />
      </View>
      <Text variant="caption" tone="secondary" className="self-end">
        {t('journey.feedback.commentCounter', { count: value.length, max: maxLength })}
      </Text>
    </View>
  );
}
