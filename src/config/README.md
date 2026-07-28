# Configuration System

## Purpose
This folder provides a clean, scalable starting point for environment and runtime configuration. The structure is designed to support future development, deployment, and integration work without overcommitting to a specific implementation.

## Folder structure
- env/: environment variable accessors and runtime environment grouping
- constants/: default application constants and feature flag defaults
- index.ts: central export for configuration values used by the application

## How new configuration should be added
1. Add new environment variables to .env.example.
2. Group related variables by business or operational concern.
3. Expose the value through src/config/env or src/config/constants as appropriate.
4. Re-export from src/config/index.ts.

## Naming conventions
- Use uppercase names for environment variables.
- Use camelCase for runtime configuration values.
- Keep configuration names descriptive and consistent with the business domain.

## Secret handling rules
- Never hardcode secrets.
- Keep secret values in local environment files and never commit them.
- Use placeholder values in .env.example.

## Feature flag guidelines
- Feature flags should remain explicit and easy to review.
- Flags should be documented in .env.example.
- New flags should be introduced only when they support future growth or staged rollout.

## Validation strategy
Validation should be introduced in a dedicated step once the configuration surface becomes more complex. For now, the structure prepares for future validation by keeping environment access centralized and by documenting where validation will occur: at the boundary between environment variables and runtime configuration.
