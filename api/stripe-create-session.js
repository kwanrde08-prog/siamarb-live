module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  }

  try {
    const body = new URLSearchParams();
    body.append('payment_method_types[]', 'card');
    body.append('mode', 'payment');
    body.append('line_items[0][price_data][currency]', 'thb');
    body.append('line_items[0][price_data][product_data][name]', 'SiamArb VIP (1 month)');
    body.append('line_items[0][price_data][unit_amount]', '49900');
    body.append('line_items[0][quantity]', '1');
    body.append('success_url', `${req.headers.origin || 'http://localhost:3000'}/?purchase=success`);
    body.append('cancel_url', `${req.headers.origin || 'http://localhost:3000'}/?purchase=cancel`);

    const upstream = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(500).json({ error: 'stripe session failed', detail: data });
    }

    return res.status(200).json({ url: data.url, id: data.id });
  } catch (err) {
    console.error('stripe session error', err);
    return res.status(500).json({ error: 'unexpected stripe error', message: String(err) });
  }
};
