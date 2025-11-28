# TRANSRIFY Project Structure

## Mobile App (Expo)

```
mobile/
├── app/                    # Expo Router screens
├── components/             # shadcn-compatible UI components
├── modules/
│   ├── auth/              # Authentication module
│   ├── evidence/          # Evidence capture (GPS, video, audio, device detection)
│   └── contacts/          # Emergency contact management
├── services/              # API client and utilities
└── types/                 # TypeScript interfaces
```

## Backend

```
backend/
├── src/
│   ├── routes/            # Express route handlers
│   ├── services/
│   │   ├── auth/          # Authentication & PIN validation
│   │   ├── emergency/     # Emergency protocol orchestration
│   │   ├── evidence/      # Evidence storage with hash chaining
│   │   ├── notification/  # Multi-channel notifications (SMS, push, email)
│   │   └── audit/         # Audit logging & compliance
│   ├── models/            # Data models (User, EmergencySession, Evidence, AuditLog)
│   ├── middleware/        # Auth, mTLS, rate limiting
│   └── utils/             # Crypto, hashing, validation helpers
├── tests/
│   ├── properties/        # Property-based tests (fast-check)
│   └── unit/              # Unit tests (Jest)
└── config/                # Environment configuration
```

## Key Architectural Patterns

- **Services**: Business logic isolated in service classes
- **Hash Chaining**: Audit logs and evidence portfolios use cryptographic hash chains for integrity
- **Stealth Mode**: Duress responses are architecturally identical to normal responses
- **Access Control**: Role-based for admins, authorization checks for evidence access
