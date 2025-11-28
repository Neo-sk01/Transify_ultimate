# Property-Based Tests

This directory contains property-based tests using fast-check.

## Test Annotation Format

All property-based tests MUST include the following annotation:

```typescript
/**
 * **Feature: transrify-core, Property {number}: {property_text}**
 * **Validates: Requirements {X.Y}**
 */
```

## Configuration

Property tests are configured to run a minimum of 100 iterations per property.

```typescript
const fcConfig = {
  numRuns: 100,
  verbose: true,
};
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific property test file
npm test -- tests/properties/auth.property.test.ts
```
