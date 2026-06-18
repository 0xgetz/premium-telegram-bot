/**
 * Optional standalone HTTP server for Stripe webhooks.
 * Run alongside the bot (e.g. `tsx src/server.ts`) and point your Stripe
 * webhook endpoint at https://yourdomain.com/stripe/webhook.
 */
import http from 'node:http';
import { config } from './config.js';
import { handleWebhook } from './services/stripeService.js';

const PORT = Number(process.env.PORT ?? 3000);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/stripe/webhook') {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        handleWebhook(Buffer.concat(chunks), req.headers['stripe-signature'] as string);
        res.writeHead(200).end('ok');
      } catch (e) {
        console.error('Webhook error:', e);
        res.writeHead(400).end('invalid');
      }
    });
    return;
  }
  res.writeHead(404).end('not found');
});

if (!config.stripe.enabled) {
  console.warn('⚠️  Stripe is not configured — webhook server will reject events.');
}

server.listen(PORT, () => console.log(`🔌 Webhook server on :${PORT}`));
