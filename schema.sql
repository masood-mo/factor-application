-- Schema for Cloudflare D1 Database: factor-db
-- Running this script sets up permanent relational storage for your lodge app.
-- Data in these tables will NEVER be lost when you push new code commits to Git.

CREATE TABLE IF NOT EXISTS lodge_settings (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  guest_name TEXT,
  date TEXT,
  total_amount INTEGER,
  is_settled INTEGER,
  data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  seller_name TEXT,
  date TEXT,
  total_amount INTEGER,
  is_paid INTEGER,
  data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  wallet_balance INTEGER DEFAULT 0,
  data TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT,
  price INTEGER,
  category TEXT,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cheques (
  id TEXT PRIMARY KEY,
  cheque_number TEXT,
  bank_name TEXT,
  sayad_id TEXT,
  due_date TEXT,
  amount INTEGER,
  type TEXT,
  status TEXT,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wages (
  id TEXT PRIMARY KEY,
  person_name TEXT,
  amount INTEGER,
  payment_date TEXT,
  data TEXT NOT NULL
);
