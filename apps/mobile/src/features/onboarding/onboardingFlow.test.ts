import { nextStep, ONBOARDING_STEPS } from './onboardingFlow';

describe('onboarding flow', () => {
  it('follows the journey of the design mockup', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'welcome',
      'mood',
      'time',
      'budget',
      'location',
      'interests',
      'profile',
      'ready',
    ]);
  });

  it('chains every step to the next one and ends on "ready"', () => {
    expect(nextStep('welcome')).toBe('mood');
    expect(nextStep('interests')).toBe('profile');
    expect(nextStep('profile')).toBe('ready');
    expect(nextStep('ready')).toBeNull();
  });
});
