# Development Workflow

## Working approach
The project should start with a lean implementation plan that follows the architecture and product docs.

## Workflow
1. Review the architecture and domain documents.
2. Implement the smallest change that satisfies the requirement.
3. Add or update tests for business behavior.
4. Validate permissions, audit logging, and data integrity.
5. Update documentation if the design changes.

## Delivery discipline
- Do not bypass the service layer.
- Do not implement a feature outside the documented MVP scope without a documented decision.
- Keep module boundaries intact.

## Reservation expiry job

Abandoned carts hold stock forever unless someone releases it, so the expiry
policy runs as a script instead of an API endpoint (no new HTTP surface):

```bash
npm run expire-reservations                       # apply the policy
npm run expire-reservations -- --dry-run          # report only
npm run expire-reservations -- --older-than-hours 6
npm run expire-reservations -- --json --quiet      # for cron
```

The window defaults to `RESERVATION_TTL_HOURS` (48) from `.env`. An ACTIVE cart
that has not changed inside the window is marked `ABANDONED`, its reserved units
are released and every release is written to the stock ledger with the reason
"Reservation expired after Nh of inactivity".

Schedule it hourly with cron (adjust the path):

```
0 * * * * cd /path/to/clothing-business-platform && npm run expire-reservations -- --quiet >> /tmp/cbp-expiry.log 2>&1
```

## Administrator account

The first admin is created (or refreshed) from the code, so the permission list
stays in one place:

```bash
npm run make-admin                                   # admin@example.com / Admin12345!
npm run make-admin -- --email me@store.com --password 'A-strong-password' --branch FACTORY
```

It upserts the `ADMIN` role with **every** permission found in
`modules/auth/application/permissions.ts`, creates the employee account when it is
missing, attaches the role and (optionally) a branch. The admin can then create
employees, customers, roles and branches from `/admin`.
