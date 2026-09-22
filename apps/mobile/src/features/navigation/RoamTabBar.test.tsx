import { act, fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RoamTabBar } from './RoamTabBar';

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

describe('RoamTabBar', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows all four tabs with the active one marked selected', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <RoamTabBar
        state={makeState(0)}
        descriptors={{} as BottomTabBarProps['descriptors']}
        navigation={navigation}
        insets={insets}
      />,
    );

    expect(screen.getByRole('button', { name: 'Accueil' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Découvrir' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Favoris' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeOnTheScreen();
  });

  it('shows the icon of the currently active tab as selected, not always the first one', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <RoamTabBar
        state={makeState(2)}
        descriptors={{} as BottomTabBarProps['descriptors']}
        navigation={navigation}
        insets={insets}
      />,
    );

    expect(screen.getByRole('button', { name: 'Favoris' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Accueil' })).not.toBeSelected();
  });

  it('navigates to the tapped tab', async () => {
    const navigation = makeNavigation();
    await renderWithProviders(
      <RoamTabBar
        state={makeState(0)}
        descriptors={{} as BottomTabBarProps['descriptors']}
        navigation={navigation}
        insets={insets}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Favoris' }));

    expect(navigation.navigate).toHaveBeenCalledWith('favorites');
  });

  // The scroll-driven collapse-to-bubble morph (previously tested here) is paused for this sprint 3
  // visual-design pass (docs/DECISIONS.md D-4x) and will come back once the static pill is validated.
});
