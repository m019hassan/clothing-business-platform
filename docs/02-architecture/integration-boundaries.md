# Integration Boundaries

## Principle
External systems must never leak directly into business modules. They should be accessed through adapters and translated into domain-facing contracts.

## Payment providers
Payment providers should be wrapped behind adapter interfaces so that payment decisions remain part of the Payments module rather than being scattered across integration code.

## Email and messaging
Email, Telegram, WhatsApp, and similar communication channels should be treated as integrations. The Notifications module should decide when to send a message, while the integration layer handles provider-specific details.

## AI providers
AI services should interact with the application layer through permission-aware workflows. The AI module should never bypass domain rules or directly manipulate data outside the approved application contract.

## Object storage
Media and file attachments should be handled through an abstraction that can later switch between local storage, cloud storage, or object storage services without changing business logic.

## Shipping providers
Shipping integrations should be isolated so that orders and shipment state remain governed by the Shipping module, while external provider behavior is adapted behind a stable boundary.

## Future ERP integrations
Future ERP or supplier integrations should follow the same adapter approach. The business modules should remain protected from vendor-specific technical details.

## Adapter strategy
Each integration should have:
- an interface defined by the business-facing module
- an implementation in the integrations layer
- a translation layer that maps external responses into internal domain concepts
- clear error handling and retry behavior
