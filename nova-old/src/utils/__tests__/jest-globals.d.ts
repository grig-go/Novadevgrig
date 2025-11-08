// Temporary type declarations for Jest globals
// This file provides basic type definitions until Jest is properly configured

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;

declare namespace expect {
  interface Matchers<R> {
    toBe(expected: any): R;
    toEqual(expected: any): R;
    toContain(expected: any): R;
    toContainEqual(expected: any): R;
    toHaveLength(expected: number): R;
    toBeGreaterThan(expected: number): R;
    toBeNull(): R;
    not: Matchers<R>;
  }

  function objectContaining(obj: Record<string, any>): any;
  function stringContaining(str: string): any;
}

declare function expect<T>(actual: T): expect.Matchers<void>;
