import { useCallback, useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { apiRequest, base44 } from '@/api/phpClient';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';

const STAFF_ROLES = [
  ['owner_admin', 'Pemilik'],
  ['admin', 'Admin'],
  ['reseller', 'Reseller'],
  ['technician', 'Teknisi'],
];

export default function RegistrationApprovals() {
  const [registrations, setRegistrations] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [choices, setChoices] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pending, tenantPage] = await Promise.all([
        apiRequest('/admin/registrations'),
        base44.entities.Tenant.list({ sort: 'name', limit: 500 }),
      ]);
      setRegistrations(pending.items || []);
      setTenants(tenantPage.items || []);
      setChoices((current) => Object.fromEntries((pending.items || []).map((item) => [
        item.id,
        current[item.id] || { tenant_id: tenantPage.items?.[0]?.id || '', app_role: 'admin' },
      ])));
    } catch (err) {
      setError(err.message || 'Gagal memuat pendaftaran.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (registration) => {
    const choice = choices[registration.id];
    if (!choice?.tenant_id) { setError('Buat atau pilih perusahaan sebelum menyetujui pendaftaran.'); return; }
    setBusyId(registration.id);
    setError('');
    try {
      await apiRequest('/admin/registrations/approve', {
        method: 'POST',
        body: { email: registration.email, tenant_id: choice.tenant_id, app_role: choice.app_role },
        csrf: true,
      });
      await load();
    } catch (err) {
      setError(err.message || 'Pendaftaran tidak dapat disetujui.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Persetujuan pendaftaran" description="Tinjau setiap pendaftaran publik dan tetapkan perusahaan serta peran sebelum memberi akses." />
      {error ? <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {loading ? <LoadingScreen label="Memuat pendaftaran…" /> : registrations.length === 0 ? (
        <EmptyState icon={Users} title="Tidak ada pendaftaran tertunda" description="Pendaftaran publik yang masuk akan tampil di sini untuk ditinjau." />
      ) : (
        <Card className="border-border/70 shadow-sm"><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Pengguna</TableHead><TableHead>Perusahaan</TableHead><TableHead>Peran</TableHead><TableHead>Didaftarkan</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {registrations.map((item) => {
                const choice = choices[item.id] || { tenant_id: '', app_role: 'admin' };
                const updateChoice = (changes) => setChoices((current) => ({
                  ...current,
                  [item.id]: { ...choice, ...changes },
                }));
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.full_name}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </TableCell>
                    <TableCell>
                      <Select value={choice.tenant_id} onValueChange={(value) => updateChoice({ tenant_id: value })}>
                        <SelectTrigger className="min-w-44"><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
                        <SelectContent>{tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={choice.app_role} onValueChange={(value) => updateChoice({ app_role: value })}>
                        <SelectTrigger className="min-w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAFF_ROLES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => approve(item)} disabled={busyId === item.id || !tenants.length}>
                        <Check className="mr-2 h-4 w-4" />{busyId === item.id ? 'Menyetujui…' : 'Setujui'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </>
  );
}
