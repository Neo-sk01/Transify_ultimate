# TRANSRIFY Product Overview

TRANSRIFY is a secure authentication and verification platform that serves as a safety layer for banks, merchants, and payment systems. It is not a bank itself—it advises financial institutions on user verification status and routes them accordingly.

## Core Concept

The platform features a dual PIN system:
- **Normal PIN**: Proceeds with standard authentication
- **Duress PIN**: Triggers covert emergency protocols (alerts authorities, captures evidence) while appearing to function normally

## Key Capabilities

- PIN-based authentication with stealth duress detection
- Real-time evidence collection (GPS, video, audio, nearby device detection)
- Emergency contact and law enforcement notification
- Bank, ATM, and merchant integration via REST API
- Cardless transactions using user ID and PIN
- Administrative monitoring dashboard
- POPIA and GDPR compliant data handling

## Critical Behavior

All duress scenarios must be indistinguishable from normal operations to external observers. Error responses must never reveal PIN type information.
