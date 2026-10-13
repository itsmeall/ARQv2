import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';
import { safeReturnTo } from '@/lib/authReturnTo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const returnTo = safeReturnTo();
  const invitation = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('invite_token')
    || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('invite')
    || new URLSearchParams(window.location.search).get('invite_token')
    || '';

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await base44.auth.startGoogle(invitation, returnTo);
    } catch (err) {
      setError(err.message || 'Login Google tidak dapat dimulai.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Kata sandi tidak sama.'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ full_name: fullName, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout icon={CheckCircle2} title="Pendaftaran diterima" subtitle="Akun Anda menunggu persetujuan admin ARQ.">
        <p className="text-center text-sm text-muted-foreground">
          Kami akan mengaktifkan akses setelah admin meninjau pendaftaran untuk <strong>{email}</strong>.
        </p>
        <Button asChild className="mt-6 w-full h-12">
          <Link to="/login">Kembali ke halaman masuk</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Buat akun"
      subtitle="Pendaftaran terbuka dan perlu persetujuan admin."
      footer={<>Sudah punya akun? <Link to={'/login' + (returnTo !== '/' ? '?returnTo=' + encodeURIComponent(returnTo) : '')} className="text-primary font-medium hover:underline">Masuk</Link></>}
    >
      <Button variant="outline" className="mb-6 h-12 w-full text-sm font-medium" onClick={handleGoogle} disabled={googleLoading}>
        <GoogleIcon className="mr-2 h-5 w-5" /> {googleLoading ? 'Menghubungkan…' : invitation ? 'Klaim undangan dengan Google' : 'Lanjutkan dengan Google'}
      </Button>
      {invitation ? <p className="-mt-3 mb-4 text-center text-xs text-muted-foreground">Gunakan akun Google dengan alamat email yang sama dengan undangan. Email harus terverifikasi.</p> : null}
      {error && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!invitation ? <>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">atau daftar dengan email</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="fullName">Nama lengkap</Label><Input id="fullName" autoComplete="name" autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12" required maxLength={160} /></div>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required /></div></div>
        <div className="space-y-2"><Label htmlFor="password">Kata sandi</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="password" type="password" autoComplete="new-password" minLength={12} placeholder="Minimal 12 karakter" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required /></div></div>
        <div className="space-y-2"><Label htmlFor="confirm">Ulangi kata sandi</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="confirm" type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 pl-10" required /></div></div>
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim…</> : 'Daftar dan minta persetujuan'}
        </Button>
      </form>
      </> : null}
    </AuthLayout>
  );
}
