// supabase/functions/sync_transactions/index.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const PLAID_BASE_URLS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

// Auto-categorization — mirrors the client-side logic in lib/categories.js
function categorizeTransaction(name, merchantName, plaidCategories = []) {
  const nameLower = `${name || ''} ${merchantName || ''}`.toLowerCase();

  const RULES = [
    { patterns: ['starbucks', 'coffee', 'dunkin', 'peet', 'philz', 'espresso'], category: 'Coffee' },
    { patterns: ['uber eats', 'doordash', 'grubhub', 'postmates', 'instacart', 'seamless'], category: 'Food' },
    { patterns: ['uber', 'lyft', 'taxi', 'metro', 'subway', 'train', 'parking', 'toll', 'gas station', 'chevron', 'shell', 'exxon', 'bp'], category: 'Transportation' },
    { patterns: ['amazon', 'walmart', 'target', 'costco', 'best buy', 'ebay', 'etsy'], category: 'Shopping' },
    { patterns: ['whole foods', 'trader joe', 'safeway', 'kroger', 'publix', 'aldi', 'grocery'], category: 'Groceries' },
    { patterns: ['netflix', 'spotify', 'hulu', 'disney', 'apple tv', 'youtube premium', 'hbo', 'prime video'], category: 'Subscriptions' },
    { patterns: ['movie', 'cinema', 'amc', 'regal', 'theater', 'concert', 'ticketmaster', 'steam', 'playstation'], category: 'Entertainment' },
    { patterns: ['electric', 'water bill', 'gas bill', 'internet', 'comcast', 'at&t', 'verizon', 'phone bill'], category: 'Utilities' },
    { patterns: ['doctor', 'hospital', 'pharmacy', 'walgreens', 'cvs', 'medical', 'dental'], category: 'Healthcare' },
    { patterns: ['airline', 'airbnb', 'hotel', 'marriott', 'hilton', 'united', 'delta', 'southwest', 'expedia'], category: 'Travel' },
    { patterns: ['udemy', 'coursera', 'tuition', 'university', 'college'], category: 'Education' },
    { patterns: ['restaurant', 'diner', 'burger', 'pizza', 'sushi', 'taco', 'grill', 'bistro', 'kitchen'], category: 'Food' },
  ];

  for (const rule of RULES) {
    if (rule.patterns.some((p) => nameLower.includes(p))) {
      return rule.category;
    }
  }

  const plaidCat = (plaidCategories || []).join(' ');
  if (plaidCat.includes('Food')) return 'Food';
  if (plaidCat.includes('Travel')) return 'Travel';
  if (plaidCat.includes('Shops') || plaidCat.includes('Shopping')) return 'Shopping';
  if (plaidCat.includes('Recreation') || plaidCat.includes('Entertainment')) return 'Entertainment';
  if (plaidCat.includes('Healthcare') || plaidCat.includes('Medical')) return 'Healthcare';
  if (plaidCat.includes('Service') || plaidCat.includes('Utilities')) return 'Utilities';

  return 'Uncategorized';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  try {

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return errorResponse('Invalid or expired token', 401);


    const { bank_connection_id } = await req.json();
    if (!bank_connection_id) return errorResponse('Missing bank_connection_id', 400);


    const { data: connection, error: connError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('id', bank_connection_id)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return errorResponse('Bank connection not found or access denied', 404);
    }

    const plaidBaseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;


    let cursor = connection.cursor;
    let allAdded = [];
    let allModified = [];
    let allRemoved = [];
    let hasMore = true;

    while (hasMore) {
      const syncBody = {
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: connection.plaid_access_token,
      };


      if (cursor) {
        syncBody.cursor = cursor;
      }

      const syncResponse = await fetch(`${plaidBaseUrl}/transactions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncBody),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        console.error('Plaid sync error:', syncData);
        return errorResponse(syncData.error_message || 'Plaid sync failed', 500);
      }

      allAdded = allAdded.concat(syncData.added || []);
      allModified = allModified.concat(syncData.modified || []);
      allRemoved = allRemoved.concat(syncData.removed || []);

      // Update cursor after each page
      cursor = syncData.next_cursor;
      hasMore = syncData.has_more;
    }


    const toUpsert = [...allAdded, ...allModified].map((tx) => ({
      user_id: user.id,
      bank_connection_id: connection.id,
      plaid_transaction_id: tx.transaction_id,
      name: tx.name,
      merchant_name: tx.merchant_name || null,
      amount: tx.amount,
      iso_currency_code: tx.iso_currency_code || 'USD',
      date: tx.date,
      category: categorizeTransaction(tx.name, tx.merchant_name, tx.category),
      pending: tx.pending,
    }));


    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('transactions')
        .upsert(toUpsert, {
          onConflict: 'plaid_transaction_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return errorResponse('Failed to save transactions', 500);
      }
    }


    if (allRemoved.length > 0) {
      const removedIds = allRemoved.map((tx) => tx.transaction_id);
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('plaid_transaction_id', removedIds)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);

      }
    }


    const { error: cursorError } = await supabase
      .from('bank_connections')
      .update({ cursor, last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)
      .eq('user_id', user.id);

    if (cursorError) {
      console.error('Cursor update error:', cursorError);
      // Non-fatal: log but continue
    }


    return successResponse({
      added: allAdded.length,
      modified: allModified.length,
      removed: allRemoved.length,
      total_processed: toUpsert.length,
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});

function successResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
