/**
 * Assert utility functions for testing
 */
export class AssertUtils {
  /**
   * Assert that two values are equal
   */
  static equal<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
  }

  /**
   * Assert that a value is truthy
   */
  static truthy(value: any, message?: string): void {
    if (!value) {
      throw new Error(message || `Expected truthy value, but got ${value}`);
    }
  }

  /**
   * Assert that a value is falsy
   */
  static falsy(value: any, message?: string): void {
    if (value) {
      throw new Error(message || `Expected falsy value, but got ${value}`);
    }
  }

  /**
   * Assert that a value is greater than another
   */
  static greaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  }

  /**
   * Assert that a value is less than another
   */
  static lessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  }

  /**
   * Assert that a value is within a range
   */
  static withinRange(actual: number, min: number, max: number, message?: string): void {
    if (actual < min || actual > max) {
      throw new Error(message || `Expected ${actual} to be within range [${min}, ${max}]`);
    }
  }

  /**
   * Assert that an array contains a specific value
   */
  static arrayContains<T>(array: T[], value: T, message?: string): void {
    if (!array.includes(value)) {
      throw new Error(message || `Expected array to contain ${value}, but got ${array}`);
    }
  }

  /**
   * Assert that an array has a specific length
   */
  static arrayLength<T>(array: T[], expectedLength: number, message?: string): void {
    if (array.length !== expectedLength) {
      throw new Error(message || `Expected array length ${expectedLength}, but got ${array.length}`);
    }
  }

  /**
   * Assert that an object has all expected properties
   */
  static hasProperties(obj: any, properties: string[], message?: string): void {
    for (const property of properties) {
      if (!(property in obj)) {
        throw new Error(message || `Expected object to have property '${property}', but it doesn't`);
      }
    }
  }

  /**
   * Assert that a function throws an error
   */
  static throwsError(fn: () => any, message?: string): void {
    let didThrow = false;
    try {
      fn();
    } catch (error) {
      didThrow = true;
    }
    if (!didThrow) {
      throw new Error(message || `Expected function to throw an error, but it didn't`);
    }
  }
}
