# TRANSRIFY Tech Stack

## Mobile Application

- **Framework**: Expo (React Native) with TypeScript
- **UI Components**: shadcn-compatible libraries with NativeWind (Tailwind for React Native)
- **Device APIs**: Expo modules for camera, microphone, location, and Bluetooth

## Backend

- **Runtime**: Node.js with Express
- **Language**: TypeScript (strict mode)
- **API Style**: RESTful with mutual TLS for institution integrations

## Testing

- **Property-Based Testing**: fast-check (minimum 100 iterations per property)
- **Unit Testing**: Jest
- **Test Annotation Format**:
```typescript
/**
 * **Feature: transrify-core, Property {number}: {property_text}**
 * **Validates: Requirements {X.Y}**
 */
```

## Security

- PIN storage: bcrypt/argon2 hashing
- Data at rest: Encrypted
- Audit logs: Cryptographic hash chaining
- Evidence: Tamper-proof with integrity verification

## Common Commands

```bash
# Mobile app
npx create-expo-app          # Initialize Expo project
npx expo start               # Start development server
npx expo build               # Build for iOS/Android

# Backend
npm run dev                  # Start development server
npm run build                # Compile TypeScript
npm test                     # Run all tests
npm run test:coverage        # Run tests with coverage
```
