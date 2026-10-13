<?php
// Copy to api/config.local.php, edit only for a private local/staging environment.
// Never add real credentials or OAuth secrets to Git.
return [
    'ARQ_DB_HOST' => '127.0.0.1',
    'ARQ_DB_PORT' => '3306',
    'ARQ_DB_NAME' => '',
    'ARQ_DB_USER' => '',
    'ARQ_DB_PASSWORD' => '',
    'ARQ_APP_ORIGIN' => 'http://localhost:5173',
    'ARQ_SESSION_COOKIE' => 'arq_session',
    'ARQ_GOOGLE_CLIENT_ID' => '',
    'ARQ_GOOGLE_CLIENT_SECRET' => '',
    'ARQ_GOOGLE_REDIRECT_URI' => 'http://localhost:8000/api/auth/google/callback',
    'ARQ_MAIL_FROM' => 'noreply@localhost',
];
