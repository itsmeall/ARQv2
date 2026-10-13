import { base44 } from '@/api/base44Client';

export async function logActivity({ tenantId, actor, action, entity, entityId, description }) {
  if (!tenantId) return;
  await base44.entities.ActivityLog.create({
    tenant_id: tenantId,
    actor_name: actor || 'Sistem',
    action,
    entity,
    entity_id: entityId || '',
    description,
  });
}