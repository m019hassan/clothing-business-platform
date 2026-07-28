# Environment Strategy

## Development
Development should support fast iteration and easy local troubleshooting. It should use realistic defaults and local configuration values that do not risk affecting production data.

## Testing
Testing should be isolated and deterministic. It should verify business rules, integrations, and workflows without depending on live external systems.

## Staging
Staging should reflect the production shape closely enough to validate deployment, configuration, and operational behavior before release.

## Production
Production should prioritize stability, security, backups, monitoring, and controlled releases. It should be the environment where real business activity is handled.

## Future preview environments
Preview or temporary environments may be useful for validating new changes before release. They should be lightweight and easily disposable.
