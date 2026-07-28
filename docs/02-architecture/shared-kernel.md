# Shared Kernel

## Purpose
The shared kernel contains capabilities that are reusable across the application without representing any single business module. It should hold cross-cutting abstractions that many modules may need, but it should not contain business rules for a specific domain concept.

## What belongs here
- common types and value objects that are genuinely shared
- application result objects and error shapes
- validation helpers and common domain-level constraints
- constants and enumerations that are cross-cutting
- logging abstractions and audit contract shapes
- configuration contract definitions
- reusable utility functions that are not tied to one module

## What should not belong here
- inventory rules
- order lifecycle rules
- payment verification rules
- shipping decision logic
- product catalog business policy
- role-specific authorization logic that belongs to the permissions domain

## Why this matters
If shared becomes a dumping ground for business rules, the architecture loses clarity and the system becomes harder to understand and evolve. Shared should remain a place for reusable technical and cross-cutting abstractions, not a second home for business logic.
