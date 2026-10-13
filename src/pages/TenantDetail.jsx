import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import { apiRequest } from '@/api/phpClient';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import TenantDialog from '@/components/dialogs/TenantDialog';
import MemberDialog from '@/components/dialogs/MemberDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/format';

export default function TenantDetail() {
  const { tenantId } = useParams();
  const { displayName, isPlatformAdmin } = useSession();
  const [tenant, setTenant] = useState(null);
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState({ open: false, member: null });
  const [confirm, setConfirm] = useState(null);
  const [activation, setActivation] = useState({ busyId: null, link: '', error: '' });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [record, list, customerPage] = await Promise.all([
      base44.entities.Tenant.get(tenantId),
      base44.entities.TenantMember.filter({ tenant_id: tenantId }, { sort: 'app_role', limit: 200 }),
      base44.entities.Customer.filter({ tenant_id: tenantId }, { sort: 'name', limit: 500 }),
    ]);
    setTenant(record);
    setMembers(list?.items || []);
    setCustomers(customerPage?.items || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeMember = async (member) => {
    await base44.functions.invoke('manageMember', {
      action: 'remove',
      tenant_id: tenantId,
      email: member.email,
    });
    load();
  };

  const activateLegacyMember = async (member) => {
    setActivation({ busyId: member.id, link: '', error: '' });
    try {
      const result = await apiRequest('/admin/members/activate', {
        method: 'POST',
        csrf: true,
        body: {
          legacy_member_id: member.legacy_member_id,
          tenant_id: tenantId,
          email: member.email,
          full_name: member.name || member.email,
          phone: member.phone || '',
          app_role: member.app_role,
          customer_id: member.customer_id || null,
          commission_rate: member.commission_rate ?? null,
        },
      });
      setActivation({ busyId: null, link: `${window.location.origin}/#invite_token=${result.invitation_token}`, error: '' });
      await load();
    } catch (error) {
      setActivation({ busyId: null, link: '', error: error.message || 'Aktivasi anggota lama gagal.' });
    }
  };

  if (loading && !tenant) return <LoadingScreen label="Memuat perusahaan…" />;
  if (!tenant) return <LoadingScreen label="Perusahaan tidak ditemukan." />;

  return (
    <>
      <PageHeader title={tenant.name} description={`${tenant.owner_name || 'Tanpa penanggung jawab'} • ${tenant.contact_phone || tenant.contact_email || 'tanpa kontak'}`}>
        <Button variant="ghost" asChild>
          <Link to="/perusahaan">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setEditDialog(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Ubah perusahaan
        </Button>
        <Button onClick={() => setMemberDialog({ open: true, member: null })}>
          <Plus className="mr-2 h-4 w-4" /> Tambah anggota
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informasi perusahaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge value={tenant.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Paket</span>
              <StatusBadge value={tenant.plan} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Kode</span>
              <span className="font-mono text-xs">{tenant.code}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Komisi reseller</span>
              <span className="font-semibold">
                {tenant.commission_enabled ? `${tenant.default_commission_rate ?? 0}%` : 'Nonaktif'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Masa berlaku voucher</span>
              <span>{tenant.default_voucher_expiry_hours || 24} jam</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Portal hotspot</span>
              <span className="truncate font-mono text-xs">{tenant.hotspot_dns_name || '—'}</span>
            </div>
            {tenant.address ? (
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{tenant.address}</p>
            ) : null}
            <div className="border-t border-border/70 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Kontak</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {tenant.contact_email || '—'}
              </p>
              <p className="mt-1 text-sm">{tenant.contact_phone || '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Anggota & akses ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Plus}
                  title="Belum ada anggota"
                  description="Undang admin, reseller, teknisi, atau akun pelanggan untuk perusahaan ini."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead className="hidden sm:table-cell">Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Bergabung</TableHead>
                    <TableHead className="w-[90px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{member.name || member.email}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={member.app_role} />
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {member.phone || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={member.status} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {member.joined_date ? formatDateTime(member.joined_date) : 'Menunggu undangan'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isPlatformAdmin && member.legacy_member_id && !member.account_linked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={activation.busyId === member.id}
                              onClick={() => activateLegacyMember(member)}
                              title="Tinjau dan aktifkan anggota lama ini satu per satu"
                            >
                              <UserCheck className="mr-1 h-4 w-4" />
                              {activation.busyId === member.id ? 'Memproses…' : 'Aktifkan lama'}
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setMemberDialog({ open: true, member })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            disabled={member.app_role === 'owner_admin'}
                            onClick={() => setConfirm(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {activation.error ? <p className="px-4 py-3 text-sm text-destructive">{activation.error}</p> : null}
            {activation.link ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 p-4">
                <p className="text-sm">Akun lama disiapkan satu per satu. Kirim tautan ini kepada anggota:</p>
                <code className="max-w-full break-all rounded bg-muted px-2 py-1 text-xs">{activation.link}</code>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(activation.link)}>Salin tautan</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Perusahaan ini terdaftar {formatDate(tenant.created_date)}. Anggota yang diundang akan menerima email untuk membuat kata sandi.
      </p>

      <TenantDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        tenant={tenant}
        actor={displayName}
        onSaved={load}
      />

      <MemberDialog
        open={memberDialog.open}
        onOpenChange={(open) => setMemberDialog({ open, member: open ? memberDialog.member : null })}
        tenant={tenant}
        member={memberDialog.member}
        customers={customers}
        defaultRole={memberDialog.member?.app_role || 'admin'}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Hapus akses ${confirm?.name || confirm?.email || ''}?`}
        description="Anggota tidak bisa login lagi ke perusahaan ini."
        confirmLabel="Hapus akses"
        onConfirm={() => removeMember(confirm)}
      />
    </>
  );
}
