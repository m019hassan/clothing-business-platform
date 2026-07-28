# Non-Functional Requirements

## Performance
- Daily operational workflows should feel responsive for a small team.
- The system should support normal sales and administrative activity without noticeable delay.

## Availability
- The platform should be available during business hours and should be recoverable quickly if disruption occurs.
- The MVP should not depend on highly complex failover mechanisms.

## Scalability
- The design should allow gradual growth in products, orders, users, and locations.
- The system should avoid hard technical limits that would force a major rewrite early.

## Maintainability
- Business rules should be understandable and easy to update as the business changes.
- The system should remain manageable for a small team with limited support overhead.

## Reliability
- Stock, payment, and order information must be handled consistently to reduce operational errors.
- Critical actions should be protected by clear approval and audit practices.

## Security
- Employee access should be restricted by role and responsibility.
- Sensitive business actions should be auditable.
- Customer and payment information should be handled carefully.

## Usability
- The system should be clear enough for non-technical staff to use with minimal training.
- Common actions such as sales entry, order handling, and stock review should be straightforward.

## Accessibility
- Core workflows should be usable by employees with basic accessibility needs.
- The platform should not rely on inaccessible patterns for essential tasks.

## Auditability
- Key actions such as payment verification, inventory adjustments, and user permission changes should be traceable.

## Localization
- The system should be able to support the business language and currency needs as the operation grows.

## Backup and recovery
- The business should expect regular backups and tested recovery procedures.
- Backup practices should be simple enough to maintain without specialist support.
