// supabase/functions/exchange_public_token/index.js

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

    const { public_token, institution_name } = await req.json();
    if (!public_token) return errorResponse('Missing public_token', 400);


    const plaidBaseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;

    const exchangeResponse = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', exchangeData);
      return errorResponse(exchangeData.error_message || 'Failed to exchange token', 500);
    }

    const { access_token, item_id } = exchangeData;

    const { data: connectionData, error: dbError } = await supabase
      .from('bank_connections')
      .insert({
        user_id: user.id,
        plaid_item_id: item_id,
        plaid_access_token: access_token, // Consider encrypting this!
        institution_name: institution_name || 'Unknown Bank',
        status: 'active',
        cursor: null, // Will be set on first sync
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return errorResponse('Failed to save bank connection', 500);
    }


    return successResponse({
      success: true,
      connection_id: connectionData.id,
      institution_name: connectionData.institution_name,
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
