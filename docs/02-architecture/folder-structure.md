# Folder Structure

A practical starting structure for the modular monolith is:

```text
src/
  app/
    (public)/
    (admin)/
    api/
  modules/
    auth/
    users/
    roles/
    products/
    inventory/
    orders/
    payments/
    shipping/
    notifications/
    factory/
    reports/
    discounts/
    ai/
    integrations/
    settings/
    audit/
    shared/
  infrastructure/
    persistence/
    storage/
    integrations/
    mail/
    logging/
  config/
    env/
    feature-flags/
  shared/
    types/
    errors/
    result/
    validation/
    constants/
    contracts/
  tests/
    unit/
    integration/
    e2e/
```

## Notes
- The app directory holds route-level concerns and UI entry points.
- The modules directory hosts domain-specific logic and services.
- The shared folder contains cross-cutting abstractions, utilities, and contracts.
- Infrastructure concerns are separated from business modules so external integrations stay behind boundaries.
- The structure is intentionally simple and can evolve as the codebase grows.
