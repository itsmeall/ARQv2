<?php
declare(strict_types=1);

function b64url_decode(string $value): string|false
{
    $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
    return $decoded === false ? false : $decoded;
}

function der_length(int $length): string
{
    if ($length < 128) return chr($length);
    $bytes = '';
    while ($length > 0) { $bytes = chr($length & 0xff) . $bytes; $length >>= 8; }
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function der_integer(string $value): string
{
    if ($value !== '' && (ord($value[0]) & 0x80)) $value = "\x00" . $value;
    return "\x02" . der_length(strlen($value)) . $value;
}

function verify_google_id_token(string $jwt, string $expectedNonce): array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) throw new RuntimeException('Invalid Google identity token.');
    [$headerPart, $claimsPart, $signaturePart] = $parts;
    $header = json_decode((string)b64url_decode($headerPart), true);
    $claims = json_decode((string)b64url_decode($claimsPart), true);
    $signature = b64url_decode($signaturePart);
    if (!is_array($header) || !is_array($claims) || $signature === false || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) throw new RuntimeException('Invalid Google identity token.');

    $curl = curl_init('https://www.googleapis.com/oauth2/v3/certs');
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4]);
    $jwksBody = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if (!is_string($jwksBody) || $status !== 200) throw new RuntimeException('Google identity verification is temporarily unavailable.');
    $jwks = json_decode($jwksBody, true);
    $jwk = null;
    foreach (($jwks['keys'] ?? []) as $candidate) if (($candidate['kid'] ?? null) === $header['kid'] && ($candidate['kty'] ?? null) === 'RSA') { $jwk = $candidate; break; }
    if (!$jwk || empty($jwk['n']) || empty($jwk['e'])) throw new RuntimeException('Google identity signing key was not found.');
    $modulus = b64url_decode($jwk['n']);
    $exponent = b64url_decode($jwk['e']);
    if ($modulus === false || $exponent === false) throw new RuntimeException('Invalid Google identity signing key.');
    $rsaBody = der_integer($modulus) . der_integer($exponent);
    $rsa = "\x30" . der_length(strlen($rsaBody)) . $rsaBody;
    $algorithm = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
    $bitString = "\x03" . der_length(strlen($rsa) + 1) . "\x00" . $rsa;
    $spkiBody = $algorithm . $bitString;
    $spki = "\x30" . der_length(strlen($spkiBody)) . $spkiBody;
    $publicKey = openssl_pkey_get_public("-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n");
    if (!$publicKey || openssl_verify($headerPart . '.' . $claimsPart, $signature, $publicKey, OPENSSL_ALGO_SHA256) !== 1) throw new RuntimeException('Google identity signature is invalid.');

    $clientId = (string)getenv('ARQ_GOOGLE_CLIENT_ID');
    $now = time();
    $audience = $claims['aud'] ?? null;
    $audienceValid = is_string($audience) ? hash_equals($clientId, $audience) : (is_array($audience) && in_array($clientId, $audience, true));
    if (!in_array($claims['iss'] ?? '', ['https://accounts.google.com', 'accounts.google.com'], true)
        || !$audienceValid
        || (isset($claims['azp']) && !hash_equals($clientId, (string)$claims['azp']))
        || !isset($claims['exp'], $claims['iat'])
        || (int)($claims['exp'] ?? 0) < $now || (int)($claims['iat'] ?? 0) > $now + 60
        || !hash_equals($expectedNonce, (string)($claims['nonce'] ?? ''))
        || ($claims['email_verified'] ?? false) !== true || empty($claims['sub']) || empty($claims['email'])) throw new RuntimeException('Google identity claims did not pass validation.');
    return $claims;
}
