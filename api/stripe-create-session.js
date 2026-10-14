// Vercel serverless function to create a Stripe Checkout Session (server-side)
// This implementation uses the Stripe HTTP API directly (no stripe SDK required).
// Environment variables required in production:
// - STRIPE_SECRET_KEY

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY in environment' });

  try {
    const origin = req.headers.origin || 'https://your-site.example';
    // Build parameters for a Checkout Session for 499 THB
    const body = new URLSearchParams();
    body.append('payment_method_types[]', 'card');
    body.append('mode', 'payment');
    body.append('line_items[0][price_data][currency]', 'thb');
    body.append('line_items[0][price_data][product_data][name]', 'SiamArb VIP (1 month)');
    body.append('line_items[0][price_data][unit_amount]', String(49900)); // THB cents
    body.append('line_items[0][quantity]', '1');
    body.append('success_url', `${origin}/?purchase=success`);
    body.append('cancel_url', `${origin}/?purchase=cancel`);

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Stripe create session error', data);
      return res.status(500).json({ error: 'Stripe API error', detail: data });
    }

    // Return the session URL to redirect the client
    return res.status(200).json({ url: data.url, id: data.id });
  } catch (err) {
    console.error('api/stripe-create-session error', err);
    return res.status(500).json({ error: 'internal error', message: String(err) });
  }
};
