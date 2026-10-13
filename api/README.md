# ARQv2 PHP authentication foundation

This directory contains a local PHP/PDO authentication API and a reviewed-by-hand SQL schema. Nothing here connects to Hostinger unless an operator deploys it and supplies private environment values. `schema.sql` is not run automatically.

## Implemented policy

- Public email/password registration creates a `pending_approval` account. It cannot sign in until an administrator approves it.
- Google sign-in authenticates an already linked Google identity. A new Google identity is linked only when the callback has a one-time invitation token, Google's ID token has a verified email, and that email exactly matches the invitation.
- No identity is linked just because a Google email matches a local account.
- A valid, single-use invitation claimed through verified Google email creates an active membership. Issuing the invitation is the admin authorization; a legacy member is separately reviewed and activated by the admin one at a time before Google can claim that identity.
- Existing Base44 members are represented as `legacy_member_id` and can only be activated through the admin's explicit one-person-at-a-time endpoint.
- Platform admin status is a separate account role. Do not promote a public registration through client input.

## Routes

All routes use JSON. Mutating requests require a `csrf_token` cookie and matching `X-CSRF-Token` header. Sessions use `HttpOnly`, `SameSite=Lax`, and `Secure` when the request is HTTPS.

| Method and path | Behavior |
| --- | --- |
| `GET /api/auth/csrf` | Create/read CSRF token |
| `GET /api/auth/session` | Return account and memberships, or anonymous state |
| `POST /api/auth/register` | Create a pending public registration |
| `POST /api/auth/login` | Sign in an approved password account |
| `POST /api/auth/logout` | End the server session |
| `POST /api/auth/google/start` | Start Google OIDC; optional `invite_token` is submitted in a CSRF-protected body, not a URL |
| `GET /api/auth/google/callback` | Validate state, nonce, signature, audience, issuer, expiry, and email verification |
| `POST /api/admin/registrations/approve` | Approve one pending registration and optionally add an invited membership |
| `POST /api/admin/invitations` | Create a one-time invitation; the raw token is returned once for delivery by an approved channel |
| `POST /api/admin/members/activate` | Activate one existing legacy member by ID after an admin has reviewed its identity |

## Local setup

Requires PHP 8.1+ with PDO MySQL, OpenSSL, and cURL. Configure environment variables outside the document root. Point the web server's `/api` path to `api/public/index.php` using the rewrite example in `api/public/.htaccess`. The API must be served over HTTPS outside localhost.

The first platform admin must be provisioned by an operator through a controlled database operation in a non-production environment first. The API intentionally contains no public admin-bootstrap endpoint.

## Current integration boundary

ARQv2 pages still use Base44 entities for operational data and the current Base44 session context. Do not switch the frontend to this API until the operational entities and authorization checks have also been migrated to PHP endpoints. The Vite dev server can proxy `/api` to a local PHP server once that broader cutover is ready.
