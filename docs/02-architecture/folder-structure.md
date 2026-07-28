# Folder Structure

A practical starting structure for the modular monolith is:

```text
src/
  app/
    (public)/
    (admin)/
    api/
  modules/
    identity/
    catalog/
    inventory/
    orders/
    payments/
    shipping/
    notifications/
    ai/
    shared/
  lib/
    auth/
    config/
    prisma/
    permissions/
    audit/
    events/
  components/
    ui/
    forms/
    layouts/
  types/
  schemas/
  services/
```

## Notes
- The app directory holds route-level concerns and UI entry points.
- The modules directory hosts domain-specific logic and services.
- The shared folder contains cross-cutting infrastructure and utilities.
- This structure is intentionally simple and can evolve as the codebase grows.
