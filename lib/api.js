// lib/api.js
// ============================================================
// All calls to Supabase Edge Functions live here.
// Edge Functions run server-side and keep Plaid secrets safe.
// ============================================================

import { supabase } from './supabaseClient';
export async function createHostedLinkUrl(linkToken) {
  return callFunction('create_hosted_link_url', { link_token: linkToken });
}

// Base URL for Supabase Edge Functions
// Pattern: https://<project-ref>.supabase.co/functions/v1/<function-name>
const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

/**
 * Helper: get authorization headers with the current user's JWT.
 * Edge functions use this token to verify the user via Supabase auth.
 */
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('No active session. Please sign in.');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Helper: call an edge function with error handling.
 * Returns parsed JSON response or throws a user-friendly error.
 */
async function callFunction(functionName, body = {}) {
  const headers = await getAuthHeaders();

  console.log(`Calling edge function: ${functionName}`);

  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    // Edge functions return { error: "message" } on failure
    throw new Error(data.error || `Function ${functionName} failed with status ${response.status}`);
  }

  return data;
}

//Plaid Link Token 

/**
 * Request a Plaid link_token from the server.
 * The link_token is used to open the Plaid Link UI.
 * It expires after 30 minutes — request it fresh each time you open the modal.
 */
export async function createLinkToken() {
  return callFunction('create_link_token');
}

//Exchange Public Token 
export async function exchangePublicToken(publicToken, metadata) {
  return callFunction('exchange_public_token', {
    public_token: publicToken,
    institution_name: metadata?.institution?.name || 'Unknown Bank',
  });
}

//Sync Transactions 

export async function syncTransactions(bankConnectionId) {
  return callFunction('sync_transactions', {
    bank_connection_id: bankConnectionId,
  });
}

//Bank Connections 

/**
 * Fetch all bank connections for the current user from Supabase directly.
 */
export async function getBankConnections() {
  const { data, error } = await supabase
    .from('bank_connections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBankConnection(connectionId) {
  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId);

  if (error) throw new Error(error.message);
}

//Transactions
export async function getTransactions({ month, category, search, limit = 100 } = {}) {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  // Filter by month: e.g., "2024-01" => dates between "2024-01-01" and "2024-01-31"
  if (month) {
    const [year, mon] = month.split('-');
    const start = `${year}-${mon}-01`;
    const end = new Date(year, parseInt(mon), 0).toISOString().split('T')[0]; // last day of month
    query = query.gte('date', start).lte('date', end);
  }

  if (category) {
    query = query.eq('category', category);
  }

  // Case-insensitive search on name or merchant_name using ilike
  if (search) {
    query = query.or(`name.ilike.%${search}%,merchant_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}


//  * Get a summary of spending for a given month grouped by category.
//  * Returns: [{ category: string, total: number }]
//  *


export async function getSpendingByCategory(month) {
  const [year, mon] = month.split('-');
  const start = `${year}-${mon}-01`;
  const end = new Date(year, parseInt(mon), 0).toISOString().split('T')[0];


  // Alternatively we fetch all and aggregate client-side (simpler, fine for small datasets)
  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .gte('date', start)
    .lte('date', end)
    .eq('pending', false); // Exclude pending transactions from summaries

  if (error) throw new Error(error.message);

  // Aggregate client-side: group by category, sum amounts
  const grouped = {};
  for (const tx of data || []) {
    const cat = tx.category || 'Uncategorized';
    grouped[cat] = (grouped[cat] || 0) + tx.amount;
  }

  return Object.entries(grouped)
    .map(([category, total]) => ({ category, total: parseFloat(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total); // Sort by highest spend first
}

/**
 * Get total spending for a given month (excluding pending, excluding income/credits).
 */
export async function getTotalSpending(month) {
  const byCategory = await getSpendingByCategory(month);
  // Sum all positive amounts (positive = money out in Plaid's convention)
  return byCategory.reduce((sum, { total }) => sum + (total > 0 ? total : 0), 0);
}
