<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/load-config.php';
require_once __DIR__ . '/../src/GoogleOidc.php';
require_once __DIR__ . '/../src/EntityApi.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$cookieName = (string)(getenv('ARQ_SESSION_COOKIE') ?: 'arq_session');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name($cookieName);
session_set_cookie_params(['lifetime' => 0, 'path' => '/api', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function respond(array $body, int $status = 200): never { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host = (string)getenv('ARQ_DB_HOST'); $name = (string)getenv('ARQ_DB_NAME'); $user = (string)getenv('ARQ_DB_USER'); $password = (string)getenv('ARQ_DB_PASSWORD');
    if ($host === '' || $name === '' || $user === '') throw new RuntimeException('Database configuration is incomplete.');
    $pdo = new PDO('mysql:host=' . $host . ';port=' . (getenv('ARQ_DB_PORT') ?: '3306') . ';dbname=' . $name . ';charset=utf8mb4', $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    return $pdo;
}
function body(): array {
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($type, 'application/json')) { $value=json_decode(file_get_contents('php://input') ?: '',true); return is_array($value)?$value:[]; }
    return is_array($_POST??null)?$_POST:[];
}
function uuid(): string { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 15) | 64); $b[8] = chr((ord($b[8]) & 63) | 128); $h = bin2hex($b); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20); }
function safe_local_path(mixed $value): string {
    $path=trim((string)$value); if ($path===''||$path[0]!=='/'||str_starts_with($path,'//')||str_contains($path,'\\')||preg_match('/[\x00-\x1f]/',$path)) return '/';
    $parts=parse_url($path); if ($parts===false||isset($parts['scheme'])||isset($parts['host'])||isset($parts['user'])) return '/';
    return ($parts['path']??'/').(isset($parts['query'])?'?'.$parts['query']:'').(isset($parts['fragment'])?'#'.$parts['fragment']:'');
}
function normalized_email(mixed $email): string { $v = strtolower(trim((string)$email)); if (!filter_var($v, FILTER_VALIDATE_EMAIL) || strlen($v) > 254) throw new InvalidArgumentException('Email tidak valid.'); return $v; }
function route_path(): string { $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'; $at = strpos($path, '/api/'); return $at === false ? '/' : '/' . substr($path, $at + 5); }
function require_csrf(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? ''; $expected = rtrim((string)getenv('ARQ_APP_ORIGIN'), '/');
    if ($origin !== '' && $expected !== '' && !hash_equals($expected, rtrim($origin, '/'))) respond(['error' => 'Origin tidak diizinkan.'], 403);
    $cookie = $_COOKIE['arq_csrf'] ?? ''; $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!is_string($cookie) || $cookie === '' || !is_string($header) || !hash_equals($cookie, $header)) respond(['error' => 'Token CSRF tidak valid. Muat ulang halaman.'], 419);
}
function current_account(): array {
    if (empty($_SESSION['account_id'])) return [];
    $q = db()->prepare('SELECT id,email,full_name,status,platform_role,auth_version FROM accounts WHERE id=?'); $q->execute([$_SESSION['account_id']]); $a = $q->fetch();
    if (!$a || $a['status'] !== 'active' || (int)$a['auth_version'] !== (int)($_SESSION['auth_version']??0)) { unset($_SESSION['account_id'],$_SESSION['auth_version']); return []; }
    unset($a['auth_version']); return $a;
}
function require_account(): array { $a = current_account(); if (!$a) respond(['error' => 'Silakan masuk kembali.'], 401); return $a; }
function require_admin(): array { $a = require_account(); if ($a['platform_role'] !== 'admin') respond(['error' => 'Akses admin diperlukan.'], 403); return $a; }
function valid_role(mixed $r): bool { return in_array($r, ['owner_admin','admin','reseller','technician','customer'], true); }
function rate_limit(string $purpose, string $email, int $limit): void {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $bucket = hash('sha256', $purpose . '|' . $ip . '|' . $email);
    $q = db()->prepare("INSERT INTO auth_rate_limits (bucket_hash,window_started,attempts) VALUES (?,UTC_TIMESTAMP(),1) ON DUPLICATE KEY UPDATE attempts=IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),1,attempts+1),window_started=IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),UTC_TIMESTAMP(),window_started)");
    $q->execute([$bucket]);
    $q = db()->prepare('SELECT attempts FROM auth_rate_limits WHERE bucket_hash=?'); $q->execute([$bucket]);
    if ((int)$q->fetchColumn() > $limit) respond(['error'=>'Terlalu banyak percobaan. Coba lagi beberapa menit.'],429);
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET'; $path = route_path();
    if ($method === 'GET' && $path === '/auth/csrf') {
        $token = bin2hex(random_bytes(32)); setcookie('arq_csrf', $token, ['expires'=>0,'path'=>'/api','secure'=>$secure,'httponly'=>false,'samesite'=>'Lax']); respond(['csrf_token'=>$token]);
    }
    if ($method === 'GET' && $path === '/auth/session') {
        $a = current_account(); if (!$a) respond(['authenticated'=>false]);
        $q = db()->prepare("SELECT m.id,m.legacy_member_id,m.tenant_id,t.name AS tenant_name,m.customer_id,m.name,m.email,m.phone,m.app_role,m.status,m.commission_rate,m.joined_date FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.account_id=? AND m.status='active' AND t.status<>'suspended' ORDER BY m.created_at"); $q->execute([$a['id']]); respond(['authenticated'=>true,'account'=>$a,'memberships'=>$q->fetchAll()]);
    }
    if ($method === 'POST' && $path === '/auth/register') {
        require_csrf(); $i=body(); $email=normalized_email($i['email']??''); rate_limit('register',$email,5); $name=trim((string)($i['full_name']??'')); $password=(string)($i['password']??'');
        if ($name==='' || strlen($name)>160 || strlen($password)<12 || strlen($password)>1024) respond(['error'=>'Nama wajib diisi dan kata sandi harus berisi minimal 12 karakter.'],422);
        $q=db()->prepare("INSERT INTO accounts (id,email,email_normalized,full_name,password_hash,status) VALUES (?,?,?,?,?,'pending_approval')");
        try { $q->execute([uuid(),trim((string)$i['email']),$email,$name,password_hash($password,PASSWORD_DEFAULT)]); }
        catch (PDOException $e) { if ((string)$e->getCode()==='23000') respond(['error'=>'Email sudah terdaftar.'],409); throw $e; }
        respond(['status'=>'pending_approval','message'=>'Pendaftaran diterima dan menunggu persetujuan admin.'],202);
    }
    if ($method === 'POST' && $path === '/auth/password/forgot') {
        require_csrf(); $i=body(); $email=normalized_email($i['email']??''); rate_limit('password_reset',$email,4);
        $q=db()->prepare("SELECT id FROM accounts WHERE email_normalized=? AND status='active'"); $q->execute([$email]); $accountId=$q->fetchColumn();
        if ($accountId) {
            $token=bin2hex(random_bytes(32)); $pdo=db(); $pdo->prepare('DELETE FROM password_resets WHERE account_id=? AND used_at IS NULL')->execute([$accountId]);
            $pdo->prepare('INSERT INTO password_resets (id,account_id,token_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))')->execute([uuid(),$accountId,hash('sha256',$token)]);
            $origin=rtrim((string)getenv('ARQ_APP_ORIGIN'),'/'); $from=(string)(getenv('ARQ_MAIL_FROM')?:'noreply@isp.arkaqila.id');
            $message="Gunakan tautan berikut untuk mengganti kata sandi ARQv2 (berlaku 1 jam):\n\n".$origin.'/reset-password?token='.rawurlencode($token)."\n\nJika Anda tidak meminta penggantian, abaikan email ini.";
            $sent=mail($email,'Tautan penggantian kata sandi ARQv2',$message,'From: '.$from);
            if (!$sent) error_log('ARQ password reset email could not be delivered.');
        }
        respond(['message'=>'Jika akun aktif dengan email tersebut tersedia, tautan penggantian kata sandi akan dikirim.']);
    }
    if ($method === 'POST' && $path === '/auth/password/reset') {
        require_csrf(); rate_limit('password_reset_submit','reset',20); $i=body(); $token=(string)($i['token']??''); $password=(string)($i['new_password']??'');
        if (!preg_match('/^[a-f0-9]{64}$/',$token)||strlen($password)<12||strlen($password)>1024) respond(['error'=>'Tautan atau kata sandi tidak valid. Kata sandi minimal 12 karakter.'],422);
        $pdo=db(); $pdo->beginTransaction(); $q=$pdo->prepare('SELECT id,account_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE'); $q->execute([hash('sha256',$token)]); $reset=$q->fetch();
        if (!$reset) { $pdo->rollBack(); respond(['error'=>'Tautan penggantian kata sandi sudah kedaluwarsa atau digunakan.'],400); }
        $pdo->prepare('UPDATE accounts SET password_hash=?,auth_version=auth_version+1 WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$reset['account_id']]);
        $pdo->prepare('UPDATE password_resets SET used_at=UTC_TIMESTAMP() WHERE id=?')->execute([$reset['id']]); $pdo->commit(); respond(['reset'=>true]);
    }
    if ($method === 'POST' && $path === '/auth/login') {
        require_csrf(); $i=body(); $email=normalized_email($i['email']??''); rate_limit('login',$email,10); $pdo=db(); $q=$pdo->prepare('SELECT id,email,full_name,password_hash,status,auth_version FROM accounts WHERE email_normalized=?'); $q->execute([$email]); $a=$q->fetch();
        if (!$a || !$a['password_hash'] || !password_verify((string)($i['password']??''),$a['password_hash'])) respond(['error'=>'Email atau kata sandi salah.'],401);
        if ($a['status']!=='active') respond(['error'=>$a['status']==='pending_approval'?'Pendaftaran Anda masih menunggu persetujuan admin.':'Akun tidak aktif.'],403);
        session_regenerate_id(true); $_SESSION['account_id']=$a['id']; $_SESSION['auth_version']=(int)$a['auth_version']; unset($a['password_hash'],$a['auth_version']); respond(['authenticated'=>true,'account'=>$a]);
    }
    if ($method === 'POST' && $path === '/auth/logout') {
        require_csrf(); $_SESSION=[]; session_destroy(); setcookie($cookieName,'',['expires'=>time()-3600,'path'=>'/api','secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']); respond(['authenticated'=>false]);
    }
    if ($method === 'POST' && $path === '/auth/google/start') {
        require_csrf();
        $googleInput = body();
        $client=(string)getenv('ARQ_GOOGLE_CLIENT_ID'); $redirect=(string)getenv('ARQ_GOOGLE_REDIRECT_URI'); if ($client===''||$redirect==='') respond(['error'=>'Login Google belum dikonfigurasi di server.'],503);
        $state=bin2hex(random_bytes(32)); $nonce=bin2hex(random_bytes(32)); $_SESSION['google_state']=$state; $_SESSION['google_nonce']=$nonce; $_SESSION['google_invite']=trim((string)($googleInput['invite_token']??'')); $_SESSION['google_return_to']=safe_local_path($googleInput['return_to']??'/');
        $params=['client_id'=>$client,'redirect_uri'=>$redirect,'response_type'=>'code','scope'=>'openid email profile','state'=>$state,'nonce'=>$nonce,'prompt'=>'select_account']; header('Location: https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query($params,'','&',PHP_QUERY_RFC3986)); exit;
    }
    if ($method === 'GET' && $path === '/auth/google/callback') {
        $state=(string)($_GET['state']??''); if ($state===''||!hash_equals((string)($_SESSION['google_state']??''),$state)||empty($_SESSION['google_nonce'])) respond(['error'=>'Permintaan login Google tidak valid.'],400);
        if (!empty($_GET['error'])||empty($_GET['code'])) respond(['error'=>'Login Google dibatalkan atau gagal.'],400);
        $curl=curl_init('https://oauth2.googleapis.com/token'); curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query(['code'=>(string)$_GET['code'],'client_id'=>(string)getenv('ARQ_GOOGLE_CLIENT_ID'),'client_secret'=>(string)getenv('ARQ_GOOGLE_CLIENT_SECRET'),'redirect_uri'=>(string)getenv('ARQ_GOOGLE_REDIRECT_URI'),'grant_type'=>'authorization_code']),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10,CURLOPT_CONNECTTIMEOUT=>4]); $raw=curl_exec($curl); $status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE); curl_close($curl); $tokens=is_string($raw)?json_decode($raw,true):null;
        if ($status!==200||empty($tokens['id_token'])) respond(['error'=>'Google gagal memverifikasi login.'],401);
        $claims=verify_google_id_token((string)$tokens['id_token'],(string)$_SESSION['google_nonce']); $pdo=db(); $pdo->beginTransaction();
        $q=$pdo->prepare('SELECT a.* FROM google_identities g JOIN accounts a ON a.id=g.account_id WHERE g.google_sub=? FOR UPDATE'); $q->execute([(string)$claims['sub']]); $a=$q->fetch();
        $rawInvite=(string)($_SESSION['google_invite']??'');
        if (!$a && $rawInvite==='') { $pdo->rollBack(); respond(['error'=>'Akun Google baru hanya dapat diklaim dengan undangan admin.'],403); }
        if (!$a || $rawInvite!=='') {
            if ($rawInvite==='') { $pdo->rollBack(); respond(['error'=>'Akun Google baru hanya dapat diklaim dengan undangan admin.'],403); }
            $q=$pdo->prepare("SELECT i.* FROM invitations i JOIN tenants t ON t.id=i.tenant_id WHERE i.token_hash=? AND i.email_normalized=? AND i.claimed_at IS NULL AND i.expires_at>UTC_TIMESTAMP() AND t.status<>'suspended' FOR UPDATE"); $q->execute([hash('sha256',$rawInvite),normalized_email($claims['email'])]); $invite=$q->fetch();
            if (!$invite) { $pdo->rollBack(); respond(['error'=>'Undangan tidak valid, kedaluwarsa, sudah digunakan, atau email tidak cocok.'],403); }
            if (!$a) { $q=$pdo->prepare('SELECT * FROM accounts WHERE email_normalized=? FOR UPDATE'); $q->execute([$invite['email_normalized']]); $a=$q->fetch(); }
            if (!$a) { $a=['id'=>uuid(),'email'=>$claims['email'],'email_normalized'=>$invite['email_normalized'],'full_name'=>trim((string)($claims['name']??$claims['email'])),'status'=>'active']; $pdo->prepare("INSERT INTO accounts (id,email,email_normalized,full_name,status) VALUES (?,?,?,?, 'active')")->execute([$a['id'],$a['email'],$a['email_normalized'],$a['full_name']]); }
            if (!hash_equals((string)$invite['email_normalized'], (string)$a['email_normalized'])) { $pdo->rollBack(); respond(['error'=>'Undangan hanya dapat diklaim oleh akun dengan email yang diundang.'],403); }
            if ($a['status']!=='active') { $pdo->rollBack(); respond(['error'=>'Akun lokal belum disetujui admin.'],403); }
            $identity=$pdo->prepare('SELECT account_id FROM google_identities WHERE google_sub=? FOR UPDATE'); $identity->execute([(string)$claims['sub']]); $linkedAccount=$identity->fetchColumn();
            if ($linkedAccount && $linkedAccount!==$a['id']) { $pdo->rollBack(); respond(['error'=>'Identitas Google sudah terhubung ke akun lain.'],409); }
            if (!$linkedAccount) $pdo->prepare('INSERT INTO google_identities (account_id,google_sub) VALUES (?,?)')->execute([$a['id'],(string)$claims['sub']]);
            $memberId = $invite['legacy_member_id'] ?: uuid();
            $membershipSql = "INSERT INTO tenant_memberships (id,account_id,legacy_member_id,tenant_id,customer_id,name,email,email_normalized,phone,commission_rate,app_role,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE account_id=VALUES(account_id),tenant_id=VALUES(tenant_id),customer_id=VALUES(customer_id),name=VALUES(name),email=VALUES(email),email_normalized=VALUES(email_normalized),phone=VALUES(phone),commission_rate=VALUES(commission_rate),app_role=VALUES(app_role),status='active'";
            $pdo->prepare($membershipSql)->execute([$memberId,$a['id'],$invite['legacy_member_id'],$invite['tenant_id'],$invite['customer_id'],$invite['full_name'] ?: $a['full_name'],$claims['email'],$invite['email_normalized'],$invite['phone'],$invite['commission_rate'],$invite['app_role']]);
            $pdo->prepare('UPDATE invitations SET claimed_at=UTC_TIMESTAMP() WHERE id=?')->execute([$invite['id']]);
        }
        if ($a['status']!=='active') { $pdo->rollBack(); respond(['error'=>'Akun tidak aktif.'],403); }
        $pdo->commit(); session_regenerate_id(true); $_SESSION['account_id']=$a['id']; $_SESSION['auth_version']=(int)($a['auth_version']??1); $returnTo=safe_local_path($_SESSION['google_return_to']??'/'); unset($_SESSION['google_state'],$_SESSION['google_nonce'],$_SESSION['google_invite'],$_SESSION['google_return_to']); header('Location: '.rtrim((string)getenv('ARQ_APP_ORIGIN'),'/').$returnTo); exit;
    }
    if ($method === 'POST' && $path === '/admin/registrations/approve') {
        require_csrf(); $admin=require_admin(); $i=body(); $pdo=db(); $pdo->beginTransaction(); $q=$pdo->prepare("SELECT id FROM accounts WHERE email_normalized=? AND status='pending_approval' FOR UPDATE"); $q->execute([normalized_email($i['email']??'')]); $id=$q->fetchColumn();
        if (!$id) { $pdo->rollBack(); respond(['error'=>'Pendaftaran tertunda tidak ditemukan.'],404); } $pdo->prepare("UPDATE accounts SET status='active' WHERE id=?")->execute([$id]); $created=false;
        if (!empty($i['tenant_id'])||!empty($i['app_role'])) { if (empty($i['tenant_id'])||!valid_role($i['app_role']??null)) { $pdo->rollBack(); respond(['error'=>'tenant_id dan peran valid harus diberikan bersama.'],422); } $tenantQuery=$pdo->prepare("SELECT id FROM tenants WHERE id=? AND status<>'suspended'"); $tenantQuery->execute([(string)$i['tenant_id']]); if (!$tenantQuery->fetchColumn()) { $pdo->rollBack(); respond(['error'=>'Perusahaan tidak ditemukan atau sedang ditangguhkan.'],404); } $accountQuery=$pdo->prepare('SELECT email,full_name,email_normalized FROM accounts WHERE id=?'); $accountQuery->execute([$id]); $approved=$accountQuery->fetch(); $pdo->prepare("INSERT INTO tenant_memberships (id,account_id,tenant_id,customer_id,name,email,email_normalized,app_role,status,activated_by,activated_at,joined_date) VALUES (?,?,?,?,?,?,?,?,'active',?,UTC_TIMESTAMP(),UTC_TIMESTAMP())")->execute([uuid(),$id,(string)$i['tenant_id'],$i['customer_id']??null,$approved['full_name'],$approved['email'],$approved['email_normalized'],(string)$i['app_role'],$admin['id']]); $created=true; }
        $pdo->commit(); respond(['approved'=>true,'membership_created'=>$created]);
    }
    if ($method === 'GET' && $path === '/admin/registrations') {
        require_admin(); $q=db()->query("SELECT id,email,full_name,created_at FROM accounts WHERE status='pending_approval' ORDER BY created_at ASC LIMIT 200"); respond(['items'=>$q->fetchAll()]);
    }
    if ($method === 'POST' && $path === '/admin/members/manage') {
        require_csrf(); $actor=require_account(); $i=body(); $tenantId=trim((string)($i['tenant_id']??'')); $action=(string)($i['action']??'');
        if ($tenantId==='') respond(['error'=>'Perusahaan tidak diketahui.'],422);
        $pdo=db(); $q=$pdo->prepare("SELECT id,name,status FROM tenants WHERE id=? AND status<>'suspended'"); $q->execute([$tenantId]); $tenant=$q->fetch(); if (!$tenant) respond(['error'=>'Perusahaan tidak ditemukan atau sedang ditangguhkan.'],404);
        $context=arq_entity_context($actor); $role=$context['by_tenant'][$tenantId]['app_role']??null;
        if (!$context['platform_admin']&&!in_array($role,['owner_admin','admin'],true)) respond(['error'=>'Anda tidak memiliki izin mengelola anggota di perusahaan ini.'],403);
        $email=normalized_email($i['email']??''); $q=$pdo->prepare('SELECT * FROM tenant_memberships WHERE tenant_id=? AND email_normalized=?'); $q->execute([$tenantId,$email]); $existing=$q->fetch();
        if ($action==='remove') {
            if (!$existing) respond(['error'=>'Anggota tidak ditemukan.'],404);
            if ($existing['app_role']==='owner_admin') respond(['error'=>'Pemilik perusahaan tidak dapat dihapus.'],400);
            $pdo->prepare('DELETE FROM invitations WHERE tenant_id=? AND email_normalized=? AND claimed_at IS NULL')->execute([$tenantId,$email]);
            $pdo->prepare('DELETE FROM tenant_memberships WHERE id=?')->execute([$existing['id']]); respond(['removed'=>true]);
        }
        if (!in_array($action,['invite','update'],true)) respond(['error'=>'Aksi anggota tidak dikenal.'],422);
        $appRole=$i['app_role']??''; if (!valid_role($appRole)) respond(['error'=>'Peran tidak dikenal.'],422);
        if ($appRole==='customer'&&empty($i['customer_id'])) respond(['error'=>'Akun pelanggan harus ditautkan ke data pelanggan.'],422);
        if ($appRole==='owner_admin'&&$existing&&$existing['app_role']!=='owner_admin') respond(['error'=>'Pemilik baru harus ditetapkan melalui proses pergantian pemilik.'],400);
        $name=trim((string)($i['name']??$email)); if ($name===''||strlen($name)>160) respond(['error'=>'Nama anggota tidak valid.'],422);
        $phone=trim((string)($i['phone']??'')); $customerId=$appRole==='customer'?(string)$i['customer_id']:null;
        $commission=($appRole==='reseller'&&isset($i['commission_rate'])&&$i['commission_rate']!=='')?(float)$i['commission_rate']:null;
        $status=$existing?($i['status']??$existing['status']):'invited'; if (!in_array($status,['invited','active','suspended'],true)) respond(['error'=>'Status anggota tidak valid.'],422);
        if ($existing) {
            $q=$pdo->prepare('UPDATE tenant_memberships SET name=?,email=?,phone=?,app_role=?,customer_id=?,commission_rate=?,status=? WHERE id=?');
            $q->execute([$name,trim((string)$i['email']),$phone,$appRole,$customerId,$commission,$status,$existing['id']]); $memberId=$existing['id'];
        } else {
            $memberId=uuid(); $q=$pdo->prepare("INSERT INTO tenant_memberships (id,tenant_id,name,email,email_normalized,phone,app_role,customer_id,commission_rate,status,invited_by_name) VALUES (?,?,?,?,?,?,?,?,?,? ,?)");
            $q->execute([$memberId,$tenantId,$name,trim((string)$i['email']),$email,$phone,$appRole,$customerId,$commission,$status,$actor['full_name']]);
        }
        $pdo->prepare('DELETE FROM invitations WHERE tenant_id=? AND email_normalized=? AND claimed_at IS NULL')->execute([$tenantId,$email]);
        $invite=bin2hex(random_bytes(32));
        $q=$pdo->prepare('INSERT INTO invitations (id,email_normalized,token_hash,tenant_id,customer_id,app_role,expires_at,created_by,full_name,phone,commission_rate) VALUES (?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY),?,?,?,?)');
        $q->execute([uuid(),$email,hash('sha256',$invite),$tenantId,$customerId,$appRole,$actor['id'],$name,$phone,$commission]);
        $q=$pdo->prepare('SELECT id,tenant_id,name,email,phone,app_role,customer_id,commission_rate,status,invited_by_name,joined_date,created_at AS created_date,updated_at AS updated_date FROM tenant_memberships WHERE id=?'); $q->execute([$memberId]);
        respond(['member'=>$q->fetch(),'invitation_token'=>$invite,'invite_url'=>'/#invite_token='.$invite,'invite_sent'=>false,'invite_error'=>'Kirim tautan undangan melalui kanal yang disetujui.']);
    }
    if ($method === 'POST' && $path === '/admin/invitations') {
        require_csrf(); $admin=require_admin(); $i=body(); $email=normalized_email($i['email']??''); if (empty($i['tenant_id'])||!valid_role($i['app_role']??null)) respond(['error'=>'Tenant dan peran yang valid wajib diisi.'],422);
        $tenantQuery=db()->prepare("SELECT id FROM tenants WHERE id=? AND status<>'suspended'"); $tenantQuery->execute([(string)$i['tenant_id']]); if (!$tenantQuery->fetchColumn()) respond(['error'=>'Perusahaan tidak ditemukan atau sedang ditangguhkan.'],404);
        if (!empty($i['legacy_member_id'])) respond(['error'=>'Gunakan endpoint aktivasi manual untuk anggota lama.'],422);
        $token=bin2hex(random_bytes(32)); $q=db()->prepare('INSERT INTO invitations (id,email_normalized,token_hash,tenant_id,legacy_member_id,customer_id,app_role,expires_at,created_by,full_name,phone,commission_rate) VALUES (?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY),?,?,?,?)'); $q->execute([uuid(),$email,hash('sha256',$token),(string)$i['tenant_id'],$i['legacy_member_id']??null,$i['customer_id']??null,(string)$i['app_role'],$admin['id'],$i['full_name']??null,$i['phone']??null,$i['commission_rate']??null]); respond(['invitation_token'=>$token,'expires_in_days'=>7,'delivery'=>'Berikan melalui kanal undangan yang disetujui; token ini hanya ditampilkan sekali.'],201);
    }
    if ($method === 'POST' && $path === '/admin/members/activate') {
        require_csrf(); $admin=require_admin(); $i=body(); $legacy=trim((string)($i['legacy_member_id']??'')); if ($legacy===''||empty($i['tenant_id'])||!valid_role($i['app_role']??null)) respond(['error'=>'ID anggota lama, tenant, dan peran yang valid wajib diisi.'],422);
        $email=normalized_email($i['email']??''); $name=trim((string)($i['full_name']??'')); if ($name===''||strlen($name)>160) respond(['error'=>'Nama anggota wajib diisi.'],422);
        $pdo=db(); $pdo->beginTransaction();
        $legacyQuery=$pdo->prepare("SELECT m.id,m.account_id FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.legacy_member_id=? AND m.tenant_id=? AND t.status<>'suspended' FOR UPDATE");
        $legacyQuery->execute([$legacy,(string)$i['tenant_id']]); $legacyMember=$legacyQuery->fetch();
        if (!$legacyMember) { $pdo->rollBack(); respond(['error'=>'Anggota Base44 tersebut tidak ditemukan pada tenant ini.'],404); }
        if (!empty($legacyMember['account_id'])) { $pdo->rollBack(); respond(['error'=>'Anggota lama ini sudah terhubung ke akun.'],409); }
        $q=$pdo->prepare('SELECT id FROM accounts WHERE email_normalized=? FOR UPDATE'); $q->execute([$email]); $id=$q->fetchColumn();
        if (!$id) { $id=uuid(); $pdo->prepare("INSERT INTO accounts (id,email,email_normalized,full_name,status) VALUES (?,?,?,?, 'active')")->execute([$id,trim((string)$i['email']),$email,$name]); }
        else $pdo->prepare("UPDATE accounts SET status='active',full_name=IF(full_name='', ?, full_name) WHERE id=?")->execute([$name,$id]);
        $sql="INSERT INTO tenant_memberships (id,account_id,legacy_member_id,tenant_id,customer_id,name,email,email_normalized,phone,commission_rate,app_role,status,activated_by,activated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE account_id=VALUES(account_id),legacy_member_id=VALUES(legacy_member_id),tenant_id=VALUES(tenant_id),customer_id=VALUES(customer_id),name=VALUES(name),email=VALUES(email),email_normalized=VALUES(email_normalized),phone=VALUES(phone),commission_rate=VALUES(commission_rate),app_role=VALUES(app_role),status='active',activated_by=VALUES(activated_by),activated_at=UTC_TIMESTAMP()";
        $pdo->prepare($sql)->execute([$legacyMember['id'],$id,$legacy,(string)$i['tenant_id'],$i['customer_id']??null,$name,trim((string)$i['email']),$email,$i['phone']??null,$i['commission_rate']??null,(string)$i['app_role'],$admin['id']]); $token=bin2hex(random_bytes(32));
        $pdo->prepare('INSERT INTO invitations (id,email_normalized,token_hash,tenant_id,legacy_member_id,customer_id,app_role,expires_at,created_by,full_name,phone,commission_rate) VALUES (?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY),?,?,?,?)')->execute([uuid(),$email,hash('sha256',$token),(string)$i['tenant_id'],$legacy,$i['customer_id']??null,(string)$i['app_role'],$admin['id'],$name,$i['phone']??null,$i['commission_rate']??null]);
        $pdo->commit(); respond(['legacy_member_prepared'=>true,'invitation_token'=>$token,'membership_status'=>'active','expires_in_days'=>7]);
    }
    if (arq_entity_handle($method, $path)) exit;
    respond(['error'=>'Route tidak ditemukan.'],404);
} catch (InvalidArgumentException $e) { respond(['error'=>$e->getMessage()],422); }
catch (Throwable $e) { error_log('ARQ auth API error: '.$e->getMessage()); respond(['error'=>'Permintaan tidak dapat diproses. Periksa konfigurasi atau hubungi administrator.'],500); }
