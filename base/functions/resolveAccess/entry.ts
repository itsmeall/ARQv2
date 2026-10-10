import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { findMembership } from '../../shared/access.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await findMembership(base44, user.email, null);
    if (!member) {
      return Response.json({ linked: false, reason: 'no_membership' });
    }
    if (member.status === 'suspended') {
      return Response.json({ linked: false, reason: 'suspended' });
    }

    const isCustomer = member.app_role === 'customer';

    await base44.asServiceRole.entities.User.update(user.id, {
      tenant_id: isCustomer ? null : member.tenant_id,
      app_role: member.app_role,
      member_id: member.id,
      customer_id: member.customer_id || null,
      phone: member.phone || null,
    });

    if (member.status === 'invited') {
      member.status = 'active';
      member.joined_date = new Date().toISOString();
      await base44.asServiceRole.entities.TenantMember.update(member.id, {
        status: 'active',
        joined_date: member.joined_date,
      });
    }

    let tenant = null;
    if (!isCustomer && member.tenant_id) {
      try {
        tenant = await base44.asServiceRole.entities.Tenant.get(member.tenant_id);
      } catch (error) {
        tenant = null;
      }
    }

    return Response.json({ linked: true, member, tenant });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}