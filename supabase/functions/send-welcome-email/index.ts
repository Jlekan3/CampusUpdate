// supabase/functions/send-welcome-email/index.ts
// Deploy: npx supabase functions deploy send-welcome-email
//
// Required secret (set once):
//   npx supabase secrets set BREVO_API_KEY=<your_brevo_api_key>
//   (Get it from Brevo Dashboard → SMTP & API → API Keys → Create API key)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { email, full_name, password, role } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const roleLabel = role === 'admin' ? 'Administrator'
                    : role === 'faculty' ? 'Staff / Faculty'
                    : 'Student';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to RMU Campus</title>
  <style>
    body { margin: 0; padding: 0; background: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .hero { background: linear-gradient(135deg, #1A365D 0%, #2B4D7E 100%); padding: 40px 32px; text-align: center; }
    .hero-logo { font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 4px; }
    .hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); }
    .body { padding: 36px 32px; }
    .greeting { font-size: 22px; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
    .text { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
    .creds-box { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 20px 24px; margin: 24px 0; }
    .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E2E8F0; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
    .cred-value { font-size: 15px; font-weight: 700; color: #0F172A; font-family: 'Courier New', monospace; }
    .badge { display: inline-block; background: #EFF6FF; color: #1A365D; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 4px 12px; margin-bottom: 20px; }
    .warning { background: #FEF9EC; border: 1px solid #FCD34D; border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 10px; margin-top: 20px; }
    .warning-text { font-size: 13px; color: #92400E; line-height: 1.5; }
    .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0; }
    .footer-text { font-size: 12px; color: #94A3B8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="hero">
      <div class="hero-logo">RMU Campus</div>
      <div class="hero-sub">Regional Maritime University — Campus Navigation</div>
    </div>

    <div class="body">
      <span class="badge">${roleLabel} Account</span>
      <div class="greeting">Welcome, ${full_name || 'there'}!</div>
      <p class="text">
        Your RMU Campus account has been created by the administrator. Use the credentials below to sign in to the RMU Campus app.
      </p>

      <div class="creds-box">
        <div class="cred-row">
          <span class="cred-label">Email</span>
          <span class="cred-value">${email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password</span>
          <span class="cred-value">${password}</span>
        </div>
      </div>

      <div class="warning">
        <span style="font-size:18px;">⚠️</span>
        <div class="warning-text">
          <strong>You will be required to change this password when you first sign in.</strong>
          Please do not share these credentials with anyone.
        </div>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        Regional Maritime University · Nungua, Accra, Ghana<br/>
        This is an automated message — please do not reply.
      </p>
    </div>
  </div>
</body>
</html>`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key':      Deno.env.get('BREVO_API_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { email: 'noreply@rmu.edu.gh', name: 'RMU Campus' },
        to:          [{ email, name: full_name || email }],
        subject:     'Your RMU Campus Account — Temporary Credentials',
        htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const errBody = await brevoRes.text();
      console.error('Brevo error:', errBody);
      return new Response(JSON.stringify({ error: 'Email delivery failed', detail: errBody }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-welcome-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
