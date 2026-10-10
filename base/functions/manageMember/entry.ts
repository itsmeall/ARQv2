import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { firstRow, findMembership, MEMBER_ROLES, PLATFORM_ROLES } from '../../shared/access.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const tenantId = body?.tenant_id;
    const email = (body?.email || '').trim().toLowerCase();
    const appRole = body?.app_role;

    if (!tenantId) {
      return Response.json({ error: 'Perusahaan tidak diketahui.' }, { status: 400 });
    }

    const isPlatformAdmin = caller.role === 'admin';
    let actorName = caller.full_name || caller.email;

    if (!isPlatformAdmin) {
      const callerMember = await findMembership(base44, caller.email, tenantId);
      if (!callerMember || !PLATFORM_ROLES.includes(callerMember.app_role)) {
        return Response.json({ error: 'Anda tidak memiliki izin mengelola akses di perusahaan ini.' }, { status: 403 });
      }
      actorName = callerMember.name || actorName;
    }

    let tenant = null;
    try {
      tenant = await base44.asServiceRole.entities.Tenant.get(tenantId);
    } catch (error) {
      tenant = null;
    }
    if (!tenant) {
      return Response.json({ error: 'Perusahaan tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'invite' || action === 'update') {
      if (!email || !appRole) {
        return Response.json({ error: 'Email dan peran wajib diisi.' }, { status: 400 });
      }
      if (!MEMBER_ROLES.includes(appRole)) {
        return Response.json({ error: 'Peran tidak dikenal.' }, { status: 400 });
      }
      if (appRole === 'customer' && !body?.customer_id) {
        return Response.json({ error: 'Akun pelanggan harus ditautkan ke data pelanggan.' }, { status: 400 });
      }

      const existing = await findMembership(base44, email, tenantId);
      const payload = {
        tenant_id: tenantId,
        email,
        name: body?.name || email,
        phone: body?.phone || '',
        app_role: appRole,
        customer_id: appRole === 'customer' ? body?.customer_id : null,
        commission_rate:
          body?.commission_rate === '' || body?.commission_rate === undefined || body?.commission_rate === null
            ? null
            : Number(body.commission_rate),
      };

      let member = existing
        ? await base44.asServiceRole.entities.TenantMember.update(existing.id, payload)
        : await base44.asServiceRole.entities.TenantMember.create({
            ...payload,
            status: 'invited',
            invited_by_name: actorName,
          });

      let inviteSent = false;
      let inviteError = null;

      const users = await base44.asServiceRole.entities.User.filter({ email });
      const foundUser = firstRow(users);

      if (foundUser) {
        await base44.asServiceRole.entities.User.update(foundUser.id, {
          tenant_id: appRole === 'customer' ? null : tenantId,
          app_role: appRole,
          member_id: member.id,
          customer_id: payload.customer_id,
          phone: payload.phone,
        });
        if (member.status === 'invited') {
          member = await base44.asServiceRole.entities.TenantMember.update(member.id, {
            status: 'active',
            joined_date: new Date().toISOString(),
          });
        }
      } else {
        try {
          await base44.users.inviteUser(email, 'user');
          inviteSent = true;
        } catch (error) {
          inviteError = error.message;
        }
      }

      return Response.json({ member, invite_sent: inviteSent, invite_error: inviteError });
    }

    if (action === 'remove') {
      const member = await findMembership(base44, email, tenantId);
      if (!member) {
        return Response.json({ error: 'Anggota tidak ditemukan.' }, { status: 404 });
      }
      if (member.app_role === 'owner_admin') {
        return Response.json({ error: 'Pemilik perusahaan tidak dapat dihapus.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.TenantMember.delete(member.id);

      const users = await base44.asServiceRole.entities.User.filter({ email });
      const foundUser = firstRow(users);
      if (foundUser) {
        await base44.asServiceRole.entities.User.update(foundUser.id, {
          tenant_id: null,
          app_role: null,
          member_id: null,
          customer_id: null,
        });
      }

      return Response.json({ removed: true });
    }

    return Response.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}