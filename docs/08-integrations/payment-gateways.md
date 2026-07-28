# Payment Gateways

## MVP strategy
The MVP should support:
- Cash on delivery
- Bank transfer with manual verification
- Optional manual payment confirmation workflows

## Future strategy
- Add online payment providers incrementally after the MVP
- Keep payment provider integrations behind an adapter interface so the order and payment domain remains stable

## Integration considerations
- Payment provider credentials must be stored securely.
- Webhooks should be verified and idempotent.
- Failed provider calls must not corrupt order or payment state.
