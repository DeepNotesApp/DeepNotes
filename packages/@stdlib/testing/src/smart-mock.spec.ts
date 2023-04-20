import { createSmartMock } from './smart-mock';

describe('Smart Mock', () => {
  it('should allow deep access', () => {
    const smartMock = createSmartMock();

    smartMock.a.b.c[1][2][3] = 1;

    expect(smartMock.a.b.c[1][2][3]).toBe(1);
  });

  it('should be callable without any arguments', () => {
    const smartMock = createSmartMock();

    expect(() => smartMock()).not.toThrow();
  });

  it('should be callable with standard function', () => {
    const smartMock = createSmartMock(() => 1);

    expect(smartMock()).toBe(1);
  });

  it('should be callable with Mock', () => {
    const fn = vi.fn(() => 1);

    const smartMock = createSmartMock(fn);

    expect(fn.mock.calls.length).toBe(0);
    expect(smartMock()).toBe(1);
    expect(fn.mock.calls.length).toBe(1);
  });

  it('should allow deep access through function', () => {
    const smartMock = createSmartMock();

    smartMock.a.b.c[1][2][3].asd().sdf = 1;

    expect(smartMock.a.b.c[1][2][3].asd().sdf).toBe(1);
  });

  it('should be constructable', () => {
    const smartMock = createSmartMock(() => ({ asd: 1 }));

    expect(new smartMock().asd).toBe(1);
  });

  it('should accept object as parameter', () => {
    const smartMock = createSmartMock({ asd: 1, sdf: () => 2 });

    expect(smartMock.asd).toBe(1);
    expect(smartMock.sdf()).toBe(2);
  });

  it('should be callable even with object as parameter', () => {
    const smartMock = createSmartMock({ asd: 1, sdf: 2 });

    expect(() => smartMock()).not.toThrow();
  });

  it('should resolve when awaited', async () => {
    const smartMock = createSmartMock();

    await smartMock;
  });

  it('should contain extendable functions', async () => {
    const smartMock = createSmartMock();

    smartMock.func = () => 1;
    smartMock.func.asd.sdf = 2;

    expect(smartMock.func.asd.sdf).toBe(2);
  });
});
