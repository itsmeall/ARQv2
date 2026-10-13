# ARQv2

ARQv2 is being moved from Base44 to a React + Vite frontend with a PHP/PDO API and MySQL. The application frontend uses the PHP API under `/api`; the compatibility adapter keeps existing entity calls working while the backend transition is underway.

## Local development

Requirements: Node.js/npm, PHP 8.1+ with PDO MySQL, OpenSSL and cURL, and an isolated local MySQL database. Do not use Hostinger production credentials or point local tools at production.

1. Install frontend dependencies with `npm ci`.
2. Create a local database and apply `api/schema.sql` to that local database only.
3. Copy `api/config.local.example.php` to the ignored `api/config.local.php` and set local database, app-origin, and mail values. The PHP front controller loads it automatically. Keep real values out of Git and never put production credentials in a local setup.
4. Start the API from the repository root with `php -S 127.0.0.1:8000 -t api/public api/router.php`.
5. In another terminal, run `npm run dev`. Vite proxies `/api` to `http://127.0.0.1:8000`; set `ARQ_API_PROXY_TARGET` to use another local or isolated staging API.

Do not run `base44 dev --remote`: it sends writes to the old production backend. The current frontend/API code is not intended to be deployed until a staging migration and role-based acceptance run have passed.

## Auth and account policy

- Public email registration is pending admin approval.
- Google only creates/claims an account through a valid, single-use invitation with a matching verified email. An already-linked Google identity can sign in normally.
- Legacy Base44 memberships are reviewed and activated by an administrator one at a time.
- Tenant access is checked by the API from active membership records; frontend route checks are not the security boundary.
- Platform administrator bootstrap is a controlled operator procedure. There is no public bootstrap route.

See [api/README.md](api/README.md) for the API routes and operational configuration, [api/ENTITY-MAPPING.md](api/ENTITY-MAPPING.md) for the 13-entity map and tenant policy, and [deploy/hostinger.htaccess.example](deploy/hostinger.htaccess.example) for a deployment rewrite example.

## Staging and production

Export Base44 data only through an approved export route and keep exports outside the repository. Apply schema and import scripts only to an isolated staging database first. Reconcile per-entity counts, IDs, and references, then verify each role against both permitted and denied tenant/customer/member records. No migration runner, production database write, or cutover is performed by this repository setup. Production deployment and cutover require explicit approval after staging sign-off.

## Checks

Run the relevant project checks with `npm run lint`, `npm run typecheck`, and `npm run build` after installing dependencies. PHP syntax checks can be run with `php -l` on files under `api/` when PHP is available. Staging database behavior requires a separately provisioned staging database and approved, non-production data.
