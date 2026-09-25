import { EMPTY_ANSWERS, isStepComplete, lastReachableIndex } from './onboardingAnswers';

describe('onboarding answers', () => {
  it('needs a choice on each single-choice question', () => {
    expect(isStepComplete('mood', EMPTY_ANSWERS)).toBe(false);
    expect(isStepComplete('mood', { ...EMPTY_ANSWERS, mood: 'curious' })).toBe(true);
    expect(isStepComplete('location', { ...EMPTY_ANSWERS, location: 'around' })).toBe(true);
  });

  it('needs at least one interest', () => {
    expect(isStepComplete('interests', EMPTY_ANSWERS)).toBe(false);
    expect(isStepComplete('interests', { ...EMPTY_ANSWERS, interests: new Set(['nature']) })).toBe(
      true,
    );
  });

  it('lets the user reach the slides up to the first unanswered question', () => {
    expect(lastReachableIndex(EMPTY_ANSWERS)).toBe(0);
    expect(lastReachableIndex({ ...EMPTY_ANSWERS, mood: 'curious', time: 'over4h' })).toBe(2);
    // An answer further on does not open a slide past an unanswered one.
    expect(lastReachableIndex({ ...EMPTY_ANSWERS, mood: 'curious', budget: 'free' })).toBe(1);
    expect(
      lastReachableIndex({
        mood: 'curious',
        time: 'over4h',
        budget: 'free',
        location: 'around',
        interests: new Set(['nature']),
      }),
    ).toBe(4);
  });
});
