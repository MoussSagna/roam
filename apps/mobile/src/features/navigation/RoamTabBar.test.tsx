import { act, fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable } from 'react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RoamTabBar } from './RoamTabBar';
import { TabBarCollapseProvider, useTabBarCollapse } from './TabBarCollapseContext';

const TAB_NAMES = ['home', 'discover', 'favorites', 'profile'] as const;

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

/** Exposes `collapse()` from the context so a test can force the collapsed state. */
function CollapseTrigger() {
  const { collapse } = useTabBarCollapse();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="force-collapse" onPress={collapse} />
  );
}

describe('RoamTabBar', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows all four tabs with the active one marked selected', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <TabBarCollapseProvider>
        <RoamTabBar
          state={makeState(0)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('button', { name: 'Accueil' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Découvrir' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Favoris' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeOnTheScreen();
  });

  it('shows the icon of the currently active tab as selected, not always the first one', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <TabBarCollapseProvider>
        <RoamTabBar
          state={makeState(2)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('button', { name: 'Favoris' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Accueil' })).not.toBeSelected();
  });

  it('navigates to the tapped tab', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <TabBarCollapseProvider>
        <RoamTabBar
          state={makeState(0)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
      </TabBarCollapseProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Favoris' }));

    expect(navigation.navigate).toHaveBeenCalledWith('favorites');
  });

  it('collapses to a bubble showing only the active tab, and expands again on tap', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <TabBarCollapseProvider>
        <RoamTabBar
          state={makeState(1)}
          descriptors={{} as BottomTabBarProps['descriptors']}
          navigation={navigation}
          insets={insets}
        />
        <CollapseTrigger />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('force-collapse'));

    // Only the bubble remains: the other tabs (and their labels) are gone, not just invisible.
    expect(screen.queryByRole('button', { name: 'Découvrir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Accueil' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Agrandir la barre de navigation' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Agrandir la barre de navigation' }));

    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
