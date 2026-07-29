# Account

The Account entity represents the authentication identity of a person or actor in the platform. It is the business record used to sign in, verify identity, manage session access, and control authentication-related states.

Account is not the same as a customer or employee. It is a security and identity concept only. Business profile information is stored separately in dedicated profile entities.

---

# Purpose

The Account entity exists to represent the login identity of a user in the system. Its purpose is to support:

- Sign-in and authentication
- Identity verification
- Account access control
- Session management
- Security and audit tracking

---

# Responsibilities

The Account entity is responsible for:

- Representing how a user authenticates into the system
- Holding login-related identity data
- Supporting account lifecycle states
- Enabling secure access across multiple channels and future authentication methods
- Maintaining a clear separation between authentication and business profile data

---

# Business Rules

The following business rules define the Account domain.

1. An Account represents authentication only and must not be treated as a business profile.
2. An Account may represent either a Customer or an Employee, but these are distinct business roles.
3. A Customer account can never become an Employee account.
4. Employee access is governed through Roles and Permissions.
5. Customer accounts do not receive Roles.
6. Email should be unique within the platform.
7. Phone number should be unique within the platform.
8. At least one login method must exist for an Account.
9. Password information must never be exposed through business-facing operations.
10. Archived accounts cannot log in.
11. Locked accounts require administrative action before access can be restored.
12. Pending accounts require verification before becoming fully active.
13. Authentication data must remain isolated from business profile data.
14. Account status must be auditable.

---

# Supported Login Methods

The system supports the following login approaches:

- Email + Password
- Phone Number + Password

Future support may include:

- OTP
- Google Login
- Apple Login
- Facebook Login

The Account domain should remain flexible enough to support multiple authentication methods over time.

---

# Account Attributes

The Account entity should contain business attributes such as:

- Email
- Phone Number
- Password
- Email Verified
- Phone Verified
- Last Login
- Status
- Created Date
- Updated Date
- Preferred Language
- Timezone

These attributes describe identity and access behavior without defining technical storage details.

---

# Account Status Lifecycle

The Account lifecycle should support the following statuses:

## Pending

The account exists but has not completed the required verification or activation steps. It is not fully usable until it is confirmed.

## Active

The account is verified and allowed to access the system normally.

## Suspended

The account is temporarily restricted due to security, compliance, policy, or business review concerns.

## Locked

The account is temporarily blocked because of repeated failed login attempts, suspicious behavior, or administrative action.

## Archived

The account is no longer active for normal use and is retained for historical, compliance, or audit purposes.

---

# Relationships

The Account entity relates to other domain concepts as follows:

## CustomerProfile

An Account may be associated with one CustomerProfile when the account represents a customer.

## EmployeeProfile

An Account may be associated with one EmployeeProfile when the account represents an employee.

## Session

An Account can create and maintain multiple Sessions over time.

## Audit

Account-related actions such as login, logout, password changes, lock events, and status changes should be auditable.

## Role (through Employee)

Employee accounts may receive permissions through Roles.

## Permission (through Role)

Permissions are granted to employees indirectly through Roles associated with their account.

---

# Constraints

The following business constraints apply:

- One Account has exactly one primary authentication identity.
- An Account should be linked to either a CustomerProfile or an EmployeeProfile based on its business role.
- Customer accounts cannot become Employee accounts.
- Authentication data must remain isolated from business profile data.
- Account state must support secure and auditable transitions.

---

# Security Considerations

The Account domain must support strong security practices, including:

- Password hashing and safe storage practices
- Login history tracking
- Failed login attempt monitoring
- Session expiration and renewal rules
- Future MFA support
- Future OAuth-based authentication integration

Security concerns should be modeled as business requirements even if the implementation details are handled later.

---

# Validation Rules

The Account domain should enforce the following logical validations:

- An Account must have at least one valid sign-in method.
- Email and phone number must not conflict with existing active identities.
- Pending accounts must not be treated as fully active users.
- Locked or archived accounts should not be allowed to log in.
- Account status changes should be traceable and reviewable.

---

# Lifecycle

The Account lifecycle should include the following business stages:

1. Creation
2. Verification
3. Activation
4. Usage
5. Suspension or lock if needed
6. Recovery or restoration
7. Archive when no longer active

This lifecycle should remain clear and consistent across customer and employee accounts.

---

# Future Expansion

The Account design should support future growth in the following areas:

## Mobile App

Accounts should be usable across mobile and web experiences without changing the core identity model.

## API

The domain should support secure access for external systems and services in the future.

## AI Assistant

Accounts should be able to participate in AI-driven workflows while preserving authentication boundaries and role-based permissions.

## External Identity Providers

The design should support future connections to third-party identity providers such as Google, Apple, or Facebook.

## Multiple Authentication Methods

The Account entity should remain flexible enough to support email, phone, passwordless, OTP, or social login in the future.

---

# Notes

The Account entity is intentionally narrow in scope. It exists to support identity and access only. Business-related behavior such as customer purchasing, employee performance, or operational approvals belongs elsewhere in the domain model.

This separation improves clarity, security, and long-term maintainability.

---

# Open Questions

The following questions should be resolved during domain review:

- Should all accounts support both email and phone login, or only one of them by default?
- Should pending accounts be automatically archived after a defined period?
- Should suspended accounts be recoverable without administrator intervention?
- Should customer and employee accounts share the same base identity lifecycle, or require distinct rules?
- How should future MFA and OAuth be represented in the business domain model?
- Should login history be retained for all accounts or only for high-risk accounts?
