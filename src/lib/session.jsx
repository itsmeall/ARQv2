import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { asItem } from '@/lib/db';

const SessionContext = createContext(null);

const fieldOf = (user, key) => user?.[key] ?? user?.data?.[key] ?? null;

// Service-role resolution: links the logged-in user to its membership row and returns that
// membership plus its company, reading with privileges the login user may not have yet.
const requestAccess = async () => {
  const response = await base44.functions.invoke('resolveAccess', {});
  return response?.data || {};
};

export function SessionProvider({ children }) {
  const [session, setSession] = useState({ loading: true });

  const load = useCallback(async () => {
    setSession({ loading: true, reload: load });

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (error) {
      setSession({ loading: false, anonymous: true, reload: load });
      return;
    }

    const base = {
      user,
      isPlatformAdmin: user?.role === 'admin',
      displayName: user?.full_name || user?.email || 'Pengguna',
      reload: load,
    };
    // Every exit below lands on a finished state, so the app can never stay on "Memuat…".
    const finish = (state) => setSession({ loading: false, ...base, ...state });

    let appRole = fieldOf(user, 'app_role');
    let tenantId = fieldOf(user, 'tenant_id');
    let memberId = fieldOf(user, 'member_id');
    let customerId = fieldOf(user, 'customer_id');
    let member = null;
    let tenant = null;

    // What the login user can already read for itself.
    if (appRole) {
      try {
        member = memberId
          ? await base44.entities.TenantMember.get(memberId)
          : asItem(await base44.entities.TenantMember.filter({ email: user.email }, { limit: 1 }));
      } catch (error) {
        member = null;
      }
    }
    if (tenantId) {
      try {
        tenant = await base44.entities.Tenant.get(tenantId);
      } catch (error) {
        tenant = null;
      }
    }

    // Right after an invitation the login user carries no role yet, and access rules can keep
    // the membership or the company hidden until the user record is linked: ask the server,
    // which also repairs the identity, instead of giving up on a half-empty session.
    const needsRepair =
      !appRole || !member || (appRole !== 'customer' && !tenant);

    if (needsRepair) {
      let data = null;
      try {
        data = await requestAccess();
      } catch (error) {
        finish({ accessError: appRole ? 'tenant_unavailable' : 'resolve_failed' });
        return;
      }
      if (!data.linked) {
        finish({ accessError: data.reason || 'no_membership' });
        return;
      }
      member = data.member || member;
      tenant = data.tenant || tenant;
      appRole = member?.app_role || appRole;
      memberId = member?.id || memberId;
      customerId = member?.customer_id || customerId || null;
      tenantId = appRole === 'customer' ? null : member?.tenant_id || tenantId;
    }

    if (!appRole) {
      finish({ accessError: 'role_unknown' });
      return;
    }
    if (appRole !== 'customer' && !tenant) {
      finish({ accessError: 'tenant_unavailable', appRole, tenantId, memberId, member });
      return;
    }
    if (appRole === 'customer' && !customerId) {
      finish({ accessError: 'account_unlinked', appRole, memberId, member });
      return;
    }

    finish({ appRole, tenantId, memberId, customerId, member, tenant });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export const isStaffRole = (role) => role === 'owner_admin' || role === 'admin';