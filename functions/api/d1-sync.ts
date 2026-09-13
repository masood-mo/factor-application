// Cloudflare Pages Function: /api/d1-sync
// Enables permanent, zero-data-loss storage on Cloudflare D1 (factor-db)

interface Env {
  DB: any; // Cloudflare D1 Database binding
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'D1 binding DB is not configured in Cloudflare Pages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const table = url.searchParams.get('table');

  const allowedTables = [
    'lodge_settings',
    'sales_invoices',
    'purchase_invoices',
    'guests',
    'items',
    'cheques',
    'wages',
  ];

  if (!table || !allowedTables.includes(table)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing table name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { results } = await db.prepare(`SELECT data FROM ${table}`).all();
    const items = (results || []).map((row: any) => {
      try {
        return JSON.parse(row.data);
      } catch {
        return row;
      }
    });

    return new Response(JSON.stringify({ data: items }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'D1 binding DB is not configured in Cloudflare Pages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const { table, item, action } = body as { table: string; item: any; action?: string };

    const allowedTables = [
      'lodge_settings',
      'sales_invoices',
      'purchase_invoices',
      'guests',
      'items',
      'cheques',
      'wages',
    ];

    if (!table || !allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
    }

    if (action === 'delete') {
      await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(String(item.id)).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert logic
    const id = String(item.id || 'default');
    const jsonStr = JSON.stringify(item);

    if (table === 'lodge_settings') {
      await db
        .prepare(`INSERT INTO lodge_settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`)
        .bind(id, jsonStr)
        .run();
    } else if (table === 'sales_invoices') {
      await db
        .prepare(`INSERT INTO sales_invoices (id, invoice_number, guest_name, date, total_amount, is_settled, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, is_settled = excluded.is_settled, total_amount = excluded.total_amount`)
        .bind(id, item.invoiceNumber || '', item.guestName || '', item.date || '', item.finalAmount || item.totalAmount || 0, item.isSettled ? 1 : 0, jsonStr)
        .run();
    } else if (table === 'purchase_invoices') {
      await db
        .prepare(`INSERT INTO purchase_invoices (id, invoice_number, seller_name, date, total_amount, is_paid, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, is_paid = excluded.is_paid, total_amount = excluded.total_amount`)
        .bind(id, item.invoiceNumber || '', item.sellerName || '', item.date || '', item.finalAmount || item.totalAmount || 0, item.isPaid ? 1 : 0, jsonStr)
        .run();
    } else if (table === 'guests') {
      await db
        .prepare(`INSERT INTO guests (id, name, phone, wallet_balance, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, wallet_balance = excluded.wallet_balance, updated_at = CURRENT_TIMESTAMP`)
        .bind(id, item.name || '', item.phone || '', item.walletBalance || 0, jsonStr)
        .run();
    } else if (table === 'items') {
      await db
        .prepare(`INSERT INTO items (id, name, price, category, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, price = excluded.price, category = excluded.category`)
        .bind(id, item.name || '', item.price || 0, item.category || '', jsonStr)
        .run();
    } else if (table === 'cheques') {
      await db
        .prepare(`INSERT INTO cheques (id, cheque_number, bank_name, sayad_id, due_date, amount, type, status, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, status = excluded.status, amount = excluded.amount`)
        .bind(id, item.chequeNumber || '', item.bankName || '', item.sayadId || '', item.dueDate || '', item.amount || 0, item.type || '', item.status || '', jsonStr)
        .run();
    } else if (table === 'wages') {
      await db
        .prepare(`INSERT INTO wages (id, person_name, amount, payment_date, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, amount = excluded.amount`)
        .bind(id, item.personName || '', item.amount || 0, item.paymentDate || '', jsonStr)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
