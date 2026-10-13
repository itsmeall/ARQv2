<?php
declare(strict_types=1);

// Prefer a private file outside the web root; retain an ignored local fallback for development.
$configuredPath = getenv('ARQ_CONFIG_FILE');
$privateConfig = is_string($configuredPath) && $configuredPath !== ''
    ? $configuredPath
    : dirname(__DIR__) . '/config.local.php';
if (is_file($privateConfig)) {
    $settings = require $privateConfig;
    if (is_array($settings)) {
        foreach ($settings as $key => $value) {
            if (!is_string($key) || !preg_match('/^ARQ_[A-Z0-9_]+$/', $key) || !is_scalar($value)) continue;
            if (getenv($key) === false) {
                putenv($key . '=' . (string)$value);
                $_ENV[$key] = (string)$value;
                $_SERVER[$key] = (string)$value;
            }
        }
    }
}
