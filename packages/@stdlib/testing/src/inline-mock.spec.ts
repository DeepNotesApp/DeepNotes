import { createInlineMock } from './inline-mock';

describe('Inline Mock', () => {
  it('should allow deep access', () => {
    const inlineMock = createInlineMock((mock) => (mock().asd().sdf = 1));

    expect(inlineMock().asd().sdf).toBe(1);
  });
});
