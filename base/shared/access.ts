export function firstRow(result) {
  if (Array.isArray(result)) return result[0] ?? null;
  return result?.items?.[0] ?? null;
}

export async function findMembership(base44, email, tenantId) {
  const query = tenantId ? { email, tenant_id: tenantId } : { email };
  const result = await base44.asServiceRole.entities.TenantMember.filter(query);
  return firstRow(result);
}

export const MEMBER_ROLES = ['owner_admin', 'admin', 'reseller', 'technician', 'customer'];

export const PLATFORM_ROLES = ['owner_admin', 'admin'];