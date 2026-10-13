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
  auth_version INT UNSIGNED NOT NULL DEFAULT 1,
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
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  legacy_member_id VARCHAR(128) NULL,
  tenant_id VARCHAR(128) NOT NULL,
  customer_id VARCHAR(128) NULL,
  name VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  email_normalized VARCHAR(254) NOT NULL,
  phone VARCHAR(64) NULL,
  app_role ENUM('owner_admin','admin','reseller','technician','customer') NOT NULL,
  commission_rate DECIMAL(7,3) NULL,
  status ENUM('invited','active','suspended') NOT NULL DEFAULT 'invited',
  invited_by_name VARCHAR(160) NULL,
  joined_date DATETIME NULL,
  notes TEXT NULL,
  activated_by CHAR(36) NULL,
  activated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_membership_legacy_id (legacy_member_id),
  UNIQUE KEY uq_member_email_tenant (tenant_id, email_normalized),
  UNIQUE KEY uq_membership_account_tenant (account_id, tenant_id),
  KEY ix_membership_tenant_status_role (tenant_id, status, app_role),
  KEY ix_membership_customer (customer_id),
  CONSTRAINT fk_membership_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_membership_activated_by FOREIGN KEY (activated_by) REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email_normalized VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  tenant_id VARCHAR(128) NOT NULL,
  legacy_member_id VARCHAR(128) NULL,
  customer_id VARCHAR(128) NULL,
  full_name VARCHAR(160) NULL,
  phone VARCHAR(64) NULL,
  commission_rate DECIMAL(7,3) NULL,
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

CREATE TABLE IF NOT EXISTS password_resets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY ix_password_reset_account (account_id,expires_at),
  CONSTRAINT fk_password_reset_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Operational entities from base/entities. IDs remain strings to preserve Base44 IDs on import.
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(128) PRIMARY KEY, name VARCHAR(160) NOT NULL, code VARCHAR(80) NOT NULL UNIQUE,
  owner_name VARCHAR(160), contact_phone VARCHAR(64), contact_email VARCHAR(254), address TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'IDR', status ENUM('active','trial','suspended') NOT NULL DEFAULT 'active',
  plan ENUM('starter','business','enterprise') NOT NULL DEFAULT 'business', commission_enabled TINYINT(1) NOT NULL DEFAULT 1,
  default_commission_rate DECIMAL(7,3) NOT NULL DEFAULT 10, hotspot_portal_url VARCHAR(500), hotspot_dns_name VARCHAR(255),
  default_voucher_expiry_hours INT UNSIGNED NOT NULL DEFAULT 24, notes TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, name VARCHAR(160) NOT NULL,
  service_type ENUM('hotspot','pppoe') NOT NULL DEFAULT 'hotspot', speed_mbps DECIMAL(12,3),
  price DECIMAL(14,2) NOT NULL, cost DECIMAL(14,2), duration_hours DECIMAL(12,3), quota_label VARCHAR(100),
  description TEXT, status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_packages_tenant_status_name (tenant_id,status,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, name VARCHAR(160) NOT NULL, customer_code VARCHAR(100),
  email VARCHAR(254), phone VARCHAR(64), address TEXT, package_id VARCHAR(128), package_name VARCHAR(160),
  service_type ENUM('hotspot','pppoe') NOT NULL DEFAULT 'pppoe', monthly_fee DECIMAL(14,2),
  status ENUM('active','suspended','isolated','terminated') NOT NULL DEFAULT 'active', install_date DATE, notes TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_code (tenant_id,customer_code), KEY ix_customers_tenant_status_name (tenant_id,status,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voucher_batches (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, package_id VARCHAR(128) NOT NULL, package_name VARCHAR(160),
  name VARCHAR(160), quantity INT UNSIGNED NOT NULL, prefix VARCHAR(40), code_length SMALLINT UNSIGNED,
  price DECIMAL(14,2), cost DECIMAL(14,2), expiry_hours INT UNSIGNED, created_by_name VARCHAR(160), note TEXT,
  status ENUM('active','closed') NOT NULL DEFAULT 'active',
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_voucher_batches_tenant_created (tenant_id,created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vouchers (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, batch_id VARCHAR(128), package_id VARCHAR(128) NOT NULL,
  package_name VARCHAR(160), code VARCHAR(160) NOT NULL, price DECIMAL(14,2), cost DECIMAL(14,2),
  status ENUM('available','allocated','sold','void') NOT NULL DEFAULT 'available', reseller_id VARCHAR(128), reseller_name VARCHAR(160),
  sold_price DECIMAL(14,2), commission_amount DECIMAL(14,2), sold_date DATETIME, expiry_date DATETIME, note TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_voucher_tenant_code (tenant_id,code), KEY ix_voucher_tenant_status_package (tenant_id,status,package_id),
  KEY ix_voucher_reseller_status_date (tenant_id,reseller_id,status,sold_date), KEY ix_voucher_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reseller_stocks (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, reseller_id VARCHAR(128) NOT NULL, reseller_name VARCHAR(160),
  package_id VARCHAR(128) NOT NULL, package_name VARCHAR(160), quantity_in INT UNSIGNED NOT NULL DEFAULT 0,
  quantity_sold INT UNSIGNED NOT NULL DEFAULT 0, quantity_returned INT UNSIGNED NOT NULL DEFAULT 0,
  quantity_remaining INT UNSIGNED NOT NULL DEFAULT 0, price DECIMAL(14,2), commission_rate DECIMAL(7,3), last_mutation_date DATETIME,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_reseller_package (tenant_id,reseller_id,package_id), KEY ix_stock_tenant_reseller (tenant_id,reseller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_mutations (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, reseller_id VARCHAR(128) NOT NULL, reseller_name VARCHAR(160),
  package_id VARCHAR(128), package_name VARCHAR(160), type ENUM('allocation','sale','return','void') NOT NULL,
  quantity INT NOT NULL, unit_price DECIMAL(14,2), amount DECIMAL(14,2), actor_name VARCHAR(160), note TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_mutations_tenant_reseller_created (tenant_id,reseller_id,created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, customer_id VARCHAR(128) NOT NULL, customer_name VARCHAR(160),
  invoice_number VARCHAR(100) NOT NULL, period VARCHAR(20), amount DECIMAL(14,2), discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL, status ENUM('unpaid','paid','overdue','void') NOT NULL DEFAULT 'unpaid',
  issue_date DATE, due_date DATE, paid_date DATE, payment_method ENUM('cash','transfer','qris','other'), notes TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoice_tenant_number (tenant_id,invoice_number), KEY ix_invoice_tenant_status_issue (tenant_id,status,issue_date),
  KEY ix_invoice_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, customer_id VARCHAR(128), customer_name VARCHAR(160),
  ticket_number VARCHAR(100), title VARCHAR(200) NOT NULL, description TEXT,
  category ENUM('gangguan','instalasi','perangkat','tagihan','lainnya') NOT NULL DEFAULT 'gangguan',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open','in_progress','waiting','resolved','closed') NOT NULL DEFAULT 'open',
  assigned_to VARCHAR(128), assigned_to_name VARCHAR(160), resolution_note TEXT, resolved_date DATETIME, created_by_name VARCHAR(160),
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_tickets_tenant_status_created (tenant_id,status,created_date), KEY ix_tickets_assigned (tenant_id,assigned_to,status), KEY ix_tickets_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finances (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, type ENUM('income','expense') NOT NULL,
  category VARCHAR(100), amount DECIMAL(14,2) NOT NULL, description TEXT, reference VARCHAR(160), entry_date DATE, actor_name VARCHAR(160),
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_finances_tenant_date (tenant_id,entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(128) PRIMARY KEY, tenant_id VARCHAR(128) NOT NULL, actor_name VARCHAR(160), action VARCHAR(100) NOT NULL,
  entity VARCHAR(100), entity_id VARCHAR(128), description TEXT,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_activity_tenant_created (tenant_id,created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
