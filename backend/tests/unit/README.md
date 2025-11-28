# Unit Tests

This directory contains unit tests using Jest.

## Test Structure

Unit tests are organized by module:
- `models/` - Data model tests
- `services/` - Service layer tests
- `utils/` - Utility function tests

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/models/user.test.ts
```
