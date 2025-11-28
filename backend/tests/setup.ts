/**
 * Jest Test Setup
 * Common configuration and utilities for all tests
 */

import fc from 'fast-check';

// Configure fast-check defaults for property-based testing
export const fcConfig: fc.Parameters<unknown> = {
  numRuns: 100,
  verbose: true,
};

// Genesis hash for hash chain testing
export const GENESIS_HASH = '0'.repeat(64);

// Test timeout for async operations
jest.setTimeout(30000);
