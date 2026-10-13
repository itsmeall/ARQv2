# Base44 entity to MySQL mapping

Source of truth for this mapping is `base/entities/*.jsonc` in this repository. IDs use `VARCHAR(128)` so an approved staging import can preserve the original Base44 IDs. Every operational table has `created_date` and `updated_date`; `User` is represented by `accounts` plus `tenant_memberships`, and does not expose password or platform-role columns through entity CRUD.

| Base44 entity | MySQL table | Tenant/data boundary |
| --- | --- | --- |
| `Tenant` | `tenants` | Platform admin lists/creates/deletes; tenant members can read and update only their own tenant. |
| `TenantMember` | `tenant_memberships` | Same tenant; active admins manage; reseller/technician see only their own member row. `account_id` is nullable until a verified claim or password login. |
| `Package` | `packages` | Same tenant; staff writes; customer, reseller, and technician read. |
| `Customer` | `customers` | Same tenant; customer role reads only its own `customer_id`. |
| `VoucherBatch` | `voucher_batches` | Same tenant; staff only. |
| `Voucher` | `vouchers` | Same tenant; reseller reads/updates only vouchers assigned to their own member ID. |
| `ResellerStock` | `reseller_stocks` | Same tenant; reseller reads/updates its own stock; staff manage tenant stock. |
| `StockMutation` | `stock_mutations` | Same tenant and reseller where applicable; append-only. |
| `Invoice` | `invoices` | Same tenant; customer role reads only invoices for its linked customer. |
| `Ticket` | `tickets` | Same tenant; technicians read/update assigned tickets, customers read/create for their linked customer. |
| `Finance` | `finances` | Same tenant; staff only. Base44 `date` maps to SQL `entry_date`. |
| `ActivityLog` | `activity_logs` | Same tenant; read and append only; actor is assigned from the server session. |
| `User` | `accounts` + `tenant_memberships` | Session identity only; no generic CRUD route. Roles come from the active membership; platform role is separate. |

## Entity REST compatibility

The PHP API is served under `/api/entities/{Entity}`. It supports `GET` with JSON `filter`, `sort`, `limit`, and `offset`; `GET /{id}`; `POST`; `PUT /{id}`; `DELETE /{id}`; and POST subroutes `/count`, `/aggregate`, `/bulk`, and `/delete-many`. Aggregate supports `groupBy`, `sum` (one field or a list), and `sort`. Filters support equality, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, and literal substring `$regex` searches. Mutations require the session CSRF token.

The policy in the API is stricter than a frontend route check: it derives tenant scope and role from active `tenant_memberships` on every request. Submitted `tenant_id` is never treated as authorization. Platform admin is read from `accounts.platform_role`.

## Safe migration sequence

1. Export Base44 records through an approved export path and keep the export outside Git.
2. Apply `schema.sql` only to an isolated staging database after a reviewed backup.
3. Import tenant and operational records preserving IDs, then reconcile per-entity counts and references before importing account links. For imported `TenantMember` rows, retain the Base44 ID as `id` and `legacy_member_id`, leave `account_id` null, and preserve the source status.
4. Review each legacy `TenantMember` individually. The API's admin activation route takes one imported legacy ID, email, tenant, and role and records that activation; no bulk auto-activation exists.
5. Test every role against both allowed and denied tenant/customer/member IDs before considering a production cutover.

No exporter, importer, migration runner, or production database connection is included or invoked by this repository change.
