# Layered Architecture

## Overview
The application should be split into layers that separate user interaction, business rules, and infrastructure concerns. This helps the business logic remain stable even when UI or integrations change.

## Presentation layer
Responsibilities:
- render pages and forms
- collect user input
- display messages and error states
- invoke application services

Responsibilities not allowed here:
- owning core business rules
- making direct persistence decisions
- bypassing validation or authorization

## Application layer
Responsibilities:
- orchestrate use cases
- apply domain rules
- coordinate modules
- enforce permissions and validation
- produce results for the UI or integrations

This layer is the primary boundary for business workflows such as order placement, payment verification, inventory reservation, and shipment confirmation.

## Domain layer
Responsibilities:
- define core business entities and rules
- express invariants and business logic
- keep business concepts independent from transport or UI details

This layer should remain focused on business meaning rather than implementation details.

## Infrastructure layer
Responsibilities:
- access the database and storage
- integrate with payment, shipping, email, and messaging providers
- implement adapters for external systems
- manage persistence and technical concerns

## Shared layer
Responsibilities:
- provide cross-cutting abstractions
- contain utility functions and common types
- define result objects, errors, and configuration contract shapes

Shared should not contain specific business logic for a module.

## Configuration and utilities
Configuration contains environment-specific settings and feature flags. Utilities provide general-purpose technical helpers that do not embody business rules.

## Dependency direction
Allowed direction:
- Presentation -> Application -> Domain
- Application -> Infrastructure abstractions
- Infrastructure -> Domain interfaces
- Shared -> used by all layers where appropriate

Forbidden direction:
- Domain -> Presentation
- Domain -> Concrete infrastructure implementations
- Presentation -> Database or provider-specific code
