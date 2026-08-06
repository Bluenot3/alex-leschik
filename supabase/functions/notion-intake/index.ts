import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const NOTION_API = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';

const LEADS_DB = 'daddc43f4b8844e78ac221a09c8b0b58';
const SUBSCRIBERS_DB = '01c14615e9ff44688d455f18600aef32';

const PROJECT_TYPES = [
  'AI Literacy / Education', 'Product / Build', 'Partnership',
  'Speaking / Keynote', 'Automation / Systems', 'Other',
];
const BUDGET_RANGES = [
  'Under $10K', '$10K – $50K', '$50K – $200K', '$200K+', 'Not sure / Discuss',
];
const SOURCES = ['contact-modal', 'newsletter', 'footer', 'project-card', 'other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function createPage(token: string, body: unknown) {
  const res = await fetch(NOTION_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`Notion request failed [${res.status}]: ${details}`);
    throw new Error(`[${res.status}]: ${details}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = Deno.env.get('NOTION_TOKEN');
  if (!token) return json({ error: 'NOTION_TOKEN is not configured' }, 500);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const kind = payload.kind === 'newsletter' ? 'newsletter' : 'lead';
  const email = str(payload.email, 254);
  if (!EMAIL_RE.test(email)) return json({ error: 'A valid email is required.' }, 400);

  try {
    if (kind === 'newsletter') {
      await createPage(token, {
        parent: { database_id: SUBSCRIBERS_DB },
        properties: {
          Email: { title: [{ text: { content: email } }] },
          'Email Address': { email },
        },
      });
      return json({ ok: true });
    }

    const name = str(payload.name, 200);
    if (!name) return json({ error: 'Name is required.' }, 400);

    const projectType = str(payload.project_type, 80);
    const budgetRange = str(payload.budget_range, 80);
    const source = str(payload.source, 40);
    const company = str(payload.company, 200);
    const message = str(payload.message, 4000);

    const properties: Record<string, unknown> = {
      Name: { title: [{ text: { content: name } }] },
      Email: { email },
      Status: { select: { name: 'new' } },
    };
    if (company) properties['Company / Organization'] = { rich_text: [{ text: { content: company } }] };
    if (message) properties.Message = { rich_text: [{ text: { content: message } }] };
    if (PROJECT_TYPES.includes(projectType)) properties['Project Type'] = { select: { name: projectType } };
    if (BUDGET_RANGES.includes(budgetRange)) properties['Budget Range'] = { select: { name: budgetRange } };
    properties.Source = { select: { name: SOURCES.includes(source) ? source : 'other' } };

    await createPage(token, { parent: { database_id: LEADS_DB }, properties });
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Could not record the submission.', details: String(err) }, 502);
  }
});
