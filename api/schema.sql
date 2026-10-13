-- ARQv2 local-auth schema. Review and apply to a staging database manually.
-- This file is never executed by the application.
CREATE TABLE IF NOT EXISTS accounts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  email_normalized VARCHAR(254) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NULL,
  status ENUM('pending_approval','active','disabled') NOT NULL DEFAULT 'pending_approval',
  platform_role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_accounts_email_normalized (email_normalized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS google_identities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  google_sub VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_google_sub (google_sub),
  UNIQUE KEY uq_google_account (account_id),
  CONSTRAINT fk_google_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  legacy_member_id VARCHAR(128) NULL,
  tenant_id VARCHAR(128) NOT NULL,
  customer_id VARCHAR(128) NULL,
  app_role ENUM('owner_admin','admin','reseller','technician','customer') NOT NULL,
  status ENUM('invited','active','suspended') NOT NULL DEFAULT 'invited',
  activated_by CHAR(36) NULL,
  activated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_membership_legacy_id (legacy_member_id),
  UNIQUE KEY uq_membership_account_tenant (account_id, tenant_id),
  KEY ix_membership_tenant_status_role (tenant_id, status, app_role),
  CONSTRAINT fk_membership_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_activated_by FOREIGN KEY (activated_by) REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email_normalized VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  tenant_id VARCHAR(128) NOT NULL,
  legacy_member_id VARCHAR(128) NULL,
  customer_id VARCHAR(128) NULL,
  app_role ENUM('owner_admin','admin','reseller','technician','customer') NOT NULL,
  expires_at DATETIME NOT NULL,
  claimed_at DATETIME NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invitation_token (token_hash),
  KEY ix_invitation_email_expiry (email_normalized, expires_at, claimed_at),
  CONSTRAINT fk_invitation_creator FOREIGN KEY (created_by) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_hash CHAR(64) NOT NULL PRIMARY KEY,
  window_started DATETIME NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  KEY ix_rate_window (window_started)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
