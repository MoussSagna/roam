import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { useTheme } from '@/theme';

type OtpInputProps = {
  length?: number;
  value: string;
  onChangeValue: (value: string) => void;
  error?: boolean;
};

/**
 * One box per digit (design mockup "Authentification", tile 5 "Code de réinitialisation"): typing
 * a digit advances to the next box, backspace on an empty box goes back to the previous one.
 * `value` is the plain code string (e.g. "247193"); the boxes are a presentation of it, not
 * separate state, so pasting/resetting the whole code from outside just works.
 */
export function OtpInput({ length = 6, value, onChangeValue, error }: OtpInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChangeValue(next.join('').slice(0, length));
  };

  const handleChangeText = (index: number, text: string) => {
    // `text` is usually one digit, but can be a short paste (e.g. "247193" landing in box 0).
    const clean = text.replace(/[^0-9]/g, '');
    if (!clean) {
      setDigit(index, '');
      return;
    }
    if (clean.length > 1) {
      onChangeValue((value.slice(0, index) + clean).slice(0, length));
      const target = Math.min(index + clean.length, length - 1);
      inputs.current[target]?.focus();
      return;
    }
    setDigit(index, clean);
    if (index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
  };

  return (
    <View className="flex-row justify-between">
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          accessibilityLabel={t('auth.resetCode.digitLabel', { position: index + 1, length })}
          value={digit}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={2} // room for a same-tick paste landing here; handleChangeText trims it
          className="h-16 w-12 rounded-medium border text-center font-displaySemibold text-h3 text-text"
          style={{
            borderColor: error
              ? colors.error
              : focusedIndex === index
                ? colors.primary
                : colors.border,
            borderWidth: focusedIndex === index ? 1.5 : 1,
          }}
        />
      ))}
    </View>
  );
}
