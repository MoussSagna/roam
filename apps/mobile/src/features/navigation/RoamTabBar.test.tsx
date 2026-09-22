import { act, fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RoamTabBar } from './RoamTabBar';
import { TabBarCollapseProvider, useTabBarCollapse } from './TabBarCollapseContext';
import { TabTransitionProvider, useTabTransition } from './TabTransitionContext';

const TAB_NAMES = ['home', 'discover', 'favorites', 'profile'] as const;

function Providers({ children }: { children: ReactNode }) {
  return (
    <TabBarCollapseProvider>
      <TabTransitionProvider>{children}</TabTransitionProvider>
    </TabBarCollapseProvider>
  );
}

/** Renders the shared tab-switch direction as text so a test can assert on it. */
function DirectionProbe() {
  const { direction } = useTabTransition();
  return <Text>{`direction:${direction}`}</Text>;
}

/** Exposes `collapse()` from the context so a test can force the collapsed state. */
function CollapseTrigger() {
  const { collapse } = useTabBarCollapse();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="force-collapse" onPress={collapse} />
  );
}

function makeState(activeIndex: number): BottomTabBarProps['state'] {
  return {
    index: activeIndex,
    routes: TAB_NAMES.map((name) => ({ key: name, name })),
  } as BottomTabBarProps['state'];
}

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

function makeNavigation() {
  return {
    navigate: jest.fn(),
    emit: jest.fn(() => ({ defaultPrevented: false })),
  } as unknown as BottomTabBarProps['navigation'];
}

describe('RoamTabBar', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows all four tabs with the active one marked selected', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(0)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </Providers>,
    );

    expect(screen.getByRole('button', { name: 'Accueil' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Découvrir' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Favoris' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeOnTheScreen();
  });

  it('shows the icon of the currently active tab as selected, not always the first one', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(2)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </Providers>,
    );

    expect(screen.getByRole('button', { name: 'Favoris' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Accueil' })).not.toBeSelected();
  });

  it('navigates to the tapped tab', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(0)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </Providers>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Favoris' }));

    expect(navigation.navigate).toHaveBeenCalledWith('favorites');
  });

  it('records a forward direction when switching to a tab further right', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(0)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
        <DirectionProbe />
      </Providers>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Favoris' }));

    expect(screen.getByText('direction:1')).toBeOnTheScreen();
  });

  it('records a backward direction when switching to a tab further left', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(2)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
        <DirectionProbe />
      </Providers>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Accueil' }));

    expect(screen.getByText('direction:-1')).toBeOnTheScreen();
  });

  it('collapses to a bubble showing only the active tab, and expands again on tap', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(1)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
        <CollapseTrigger />
      </Providers>,
    );

    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('force-collapse'));

    // Both layers stay mounted (they crossfade), so the row must be unreachable, not just faded —
    // hidden from accessibility too, which is also what makes `getByRole` unable to find it.
    expect(screen.queryByRole('button', { name: 'Découvrir' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Agrandir la barre de navigation' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Agrandir la barre de navigation' }));

    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows the active tab in the bubble, in sync with the current route', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <Providers>
        <RoamTabBar
          state={makeState(2)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
        <CollapseTrigger />
      </Providers>,
    );

    await fireEvent.press(screen.getByLabelText('force-collapse'));

    // Tapping the bubble only expands the bar; "Favoris" (the active tab) is still what re-appears.
    await fireEvent.press(screen.getByRole('button', { name: 'Agrandir la barre de navigation' }));

    expect(screen.getByRole('button', { name: 'Favoris' })).toBeSelected();
  });
});
