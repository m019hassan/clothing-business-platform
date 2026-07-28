# Shipping Providers

## MVP strategy
- Support manual shipping handling and internal shipment states.
- Keep shipping provider integration as an adapter-based extension.

## Future strategy
- Add carrier integrations when needed.
- Support tracking number updates and shipment status synchronization.

## Design principle
Shipping providers should be isolated behind a service interface so the order and shipping domain is not tightly coupled to a single provider.
