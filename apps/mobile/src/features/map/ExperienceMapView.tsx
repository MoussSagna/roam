import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, View } from 'react-native';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';

import {
  MAP_DESIGN_HEIGHT,
  MAP_DESIGN_WIDTH,
  MAP_PARKS,
  MAP_STREETS,
} from '@/features/onboarding/components/MapPreview';
import { mapColors, useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ExperienceMapCard } from './components/ExperienceMapCard';

const PIN_SIZE = 28;
const PIN_MARGIN_PERCENT = 12;

/** Deterministic pseudo-position for an experience's pin, from a hash of its id — mock positioning,
 * not real geocoding (`Experience` has no `coordinates`, only `Place` does; resolving every place
 * would add async complexity with no real payoff for an illustrated mock map). Kept within a margin so
 * pins never sit flush against the illustration's edge. */
function pinPosition(id: string): { leftPercent: number; topPercent: number } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  const span = 100 - PIN_MARGIN_PERCENT * 2;
  return {
    leftPercent: PIN_MARGIN_PERCENT + ((hash % 1000) / 1000) * span,
    topPercent: PIN_MARGIN_PERCENT + (((hash >> 10) % 1000) / 1000) * span,
  };
}

type ExperienceMapViewProps = {
  experiences: readonly Experience[];
  onPressExperience: (experience: Experience) => void;
};

/**
 * Mocked illustrated map (Sprint 6 brief §10): same decorative streets/parks illustration as
 * onboarding's `MapPreview`, scaled to fill its container, with one pin per experience. Tapping a pin
 * opens a small bottom card (image, rating, distance, "Voir" CTA); shared by the standalone `/map`
 * route (`MapScreen`, now on `RoamMap`) and Search's inline Liste/Carte toggle — one map surface, not two parallel
 * ones (brief: "ne pas créer un système de carte parallèle"). No real map SDK this sprint.
 */
export function ExperienceMapView({ experiences, onPressExperience }: ExperienceMapViewProps) {
  const { colors, scheme } = useTheme();
  const map = mapColors[scheme];
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedExperience = experiences.find((experience) => experience.id === selectedId) ?? null;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  return (
    <View
      testID="experience-map-view"
      className="flex-1 overflow-hidden rounded-large"
      onLayout={handleLayout}
    >
      {containerSize.width > 0 ? (
        <Svg
          width={containerSize.width}
          height={containerSize.height}
          viewBox={`0 0 ${MAP_DESIGN_WIDTH} ${MAP_DESIGN_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <Rect width={MAP_DESIGN_WIDTH} height={MAP_DESIGN_HEIGHT} fill={map.base} />
          {MAP_PARKS.map((points) => (
            <Polygon key={points} points={points} fill={map.park} />
          ))}
          {MAP_STREETS.map(({ d, width: strokeWidth }) => (
            <Path key={d} d={d} stroke={map.street} strokeWidth={strokeWidth} fill="none" />
          ))}
        </Svg>
      ) : null}

      {experiences.map((experience) => {
        const { leftPercent, topPercent } = pinPosition(experience.id);
        const isSelected = experience.id === selectedId;
        return (
          <Pressable
            key={experience.id}
            accessibilityRole="button"
            accessibilityLabel={experience.title}
            accessibilityState={{ selected: isSelected }}
            onPress={() => setSelectedId(isSelected ? null : experience.id)}
            hitSlop={8}
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: PIN_SIZE,
              height: PIN_SIZE,
              marginLeft: -PIN_SIZE / 2,
              marginTop: -PIN_SIZE,
            }}
          >
            <View
              className={isSelected ? 'bg-primary' : 'bg-surface'}
              style={{
                width: PIN_SIZE,
                height: PIN_SIZE,
                borderRadius: PIN_SIZE / 2,
                borderWidth: 2,
                borderColor: isSelected ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isSelected ? colors.primaryForeground : colors.primary,
                }}
              />
            </View>
          </Pressable>
        );
      })}

      {selectedExperience ? (
        <ExperienceMapCard
          experience={selectedExperience}
          onPressView={onPressExperience}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </View>
  );
}
