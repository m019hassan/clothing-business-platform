# Architecture Review Checklist

Use this checklist when reviewing new architecture decisions or significant changes.

## Structure and boundaries
- Does each module have a clear business responsibility?
- Does the module own its own business logic?
- Does the change avoid circular dependencies?
- Are dependencies explicit and documented?

## Business alignment
- Does the design reflect the business domain and product goals?
- Does it remain simple enough for the MVP?
- Does it support the future roadmap without forcing premature complexity?

## Security and reliability
- Does the change preserve permission boundaries?
- Does it keep sensitive actions auditable?
- Does it avoid leaking external integration details into domain modules?

## Maintainability and clarity
- Does the design avoid duplicated business rules?
- Does the change require a new ADR if it alters a major architectural direction?
- Does the documentation explain why the design exists, not only what it contains?

## Evolution readiness
- Does the architecture remain easy to evolve into more modules or future services if needed?
- Does the change preserve flexibility rather than hard-coding the current implementation details?
