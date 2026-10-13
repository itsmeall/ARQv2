import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState(() => sessionStorage.getItem('arq_active_tenant'));
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const memberships = useMemo(() => user?.memberships?.filter((item) => item.status === 'active') || [], [user]);
  const membership = memberships.find((item) => item.tenant_id === selectedTenantId) || memberships[0] || null;

  useEffect(() => {
    if (!membership) {
      setTenant(null);
      return;
    }
    sessionStorage.setItem('arq_active_tenant', membership.tenant_id);
    setSelectedTenantId(membership.tenant_id);
    let current = true;
    setTenantLoading(true);
    base44.entities.Tenant.get(membership.tenant_id)
      .then((data) => { if (current) setTenant(data); })
      .catch(() => { if (current) setTenant(null); })
      .finally(() => { if (current) setTenantLoading(false); });
    return () => { current = false; };
  }, [membership?.tenant_id]);

  const session = useMemo(() => {
    const platformAdmin = user?.role === 'admin';
    if (!isAuthenticated) return { loading: false, anonymous: true };
    const noMembership = !platformAdmin && !membership;
    return {
      loading: tenantLoading,
      user,
      isPlatformAdmin: platformAdmin,
      displayName: user?.full_name || user?.email || 'Pengguna',
      appRole: membership?.app_role || null,
      tenantId: membership?.tenant_id || null,
      memberId: membership?.id || null,
      customerId: membership?.customer_id || null,
      member: membership,
      tenant,
      memberships,
      activeTenantId: membership?.tenant_id || null,
      setActiveTenant: (tenantId) => {
        if (memberships.some((item) => item.tenant_id === tenantId)) {
          sessionStorage.setItem('arq_active_tenant', tenantId);
          setSelectedTenantId(tenantId);
        }
      },
      accessError: noMembership ? 'no_membership' : (!platformAdmin && membership && !tenant && !tenantLoading ? 'tenant_unavailable' : null),
      reload: async () => {
        const fresh = await base44.auth.me();
        window.location.reload();
        return fresh;
      },
    };
  }, [user, isAuthenticated, tenantLoading, membership, tenant, memberships]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }
export const isStaffRole = (role) => role === 'owner_admin' || role === 'admin';
