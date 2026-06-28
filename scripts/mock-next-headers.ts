export function cookies() {
  return {
    get: (name: string) => ({ value: 'mock-cookie-value' }),
    set: () => {},
    delete: () => {},
  };
}
