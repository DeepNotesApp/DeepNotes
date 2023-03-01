import { createSmartMock } from './smart-mock';

export function createInlineMock(fn: (mock: any) => any) {
  const smartMock = createSmartMock();

  fn(smartMock);

  return smartMock;
}
