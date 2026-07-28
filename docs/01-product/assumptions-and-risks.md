# Assumptions and Risks

## Important assumptions
- The business will operate with a single primary production database.
- The initial deployment will focus on web-based admin and storefront experiences.
- The home server will be used for backup and recovery, not as the main production system.
- Bank transfer verification will be handled as a manual review workflow in the MVP.

## Missing or ambiguous requirements
- Preferred payment provider for online payments.
- Whether there is a need for multi-warehouse operations from day one.
- Whether customer accounts should be self-service from the start.
- Whether advanced reporting is required before the first launch.

## Risks
- Inventory overselling and partial stock reservation failures.
- Fraudulent payment proof submissions.
- Unauthorized access to sensitive admin operations.
- AI tool misuse through prompt injection or ambiguous tool routing.
- Data loss due to weak backup or restore practices.
- Overbuilding the MVP by implementing ERP-like manufacturing too early.

## Mitigations
- Use transactional inventory updates and explicit reservation handling.
- Keep approval workflows for payments and sensitive changes.
- Maintain audit logs and permission enforcement at the service layer.
- Keep AI actions behind the gateway and approval workflow.
- Define and test backup and restore procedures early.
