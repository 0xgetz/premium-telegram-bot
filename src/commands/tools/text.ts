import { Bot } from 'grammy';
import crypto from 'node:crypto';

const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....',
  i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.',
  q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-',
  y: '-.--', z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.', ' ': '/',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function safeCalc(expr: string): number {
  if (!/^[-+*/%^().\d\s]+$/.test(expr)) throw new Error('invalid characters');
  const js = expr.replace(/\^/g, '**');
  // eslint-disable-next-line no-new-func
  const val = Function('"use strict"; return (' + js + ')')();
  if (typeof val !== 'number' || !isFinite(val)) throw new Error('not a number');
  return val;
}

const md = { parse_mode: 'Markdown' as const };

export function registerTextTools(bot: Bot): void {
  bot.command('calc', (ctx) => {
    const e = ctx.match?.toString().trim();
    if (!e) return ctx.reply('Usage: `/calc 2 + 2 * (3 ^ 2)`', md);
    try {
      return ctx.reply(`🧮 ${e} = *${safeCalc(e)}*`, md);
    } catch {
      return ctx.reply('❌ Invalid expression. Allowed: numbers and + - * / % ^ ( ).');
    }
  });

  bot.command('b64', (ctx) => {
    const t = ctx.match?.toString();
    if (!t) return ctx.reply('Usage: `/b64 <text>`', md);
    return ctx.reply('🔐 ' + Buffer.from(t, 'utf8').toString('base64'));
  });

  bot.command('unb64', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/unb64 <base64>`', md);
    try {
      return ctx.reply('🔓 ' + Buffer.from(t, 'base64').toString('utf8'));
    } catch {
      return ctx.reply('❌ Not valid Base64.');
    }
  });

  bot.command('hash', (ctx) => {
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const algos = ['md5', 'sha1', 'sha256', 'sha512'];
    const algo = parts[0]?.toLowerCase();
    const text = parts.slice(1).join(' ');
    if (!algos.includes(algo) || !text) {
      return ctx.reply('Usage: `/hash <md5|sha1|sha256|sha512> <text>`', md);
    }
    return ctx.reply(`#️⃣ \`${crypto.createHash(algo).update(text).digest('hex')}\``, md);
  });

  bot.command('case', (ctx) => {
    const parts = ctx.match?.toString() ?? '';
    const m = parts.match(/^(upper|lower|title|sentence)\s+([\s\S]+)$/i);
    if (!m) return ctx.reply('Usage: `/case <upper|lower|title|sentence> <text>`', md);
    const mode = m[1].toLowerCase();
    const text = m[2];
    let out = text;
    if (mode === 'upper') out = text.toUpperCase();
    else if (mode === 'lower') out = text.toLowerCase();
    else if (mode === 'title')
      out = text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    else out = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    return ctx.reply(out);
  });

  bot.command('reverse', (ctx) => {
    const t = ctx.match?.toString();
    if (!t) return ctx.reply('Usage: `/reverse <text>`', md);
    return ctx.reply([...t].reverse().join(''));
  });

  bot.command('count', (ctx) => {
    const t = ctx.match?.toString() ?? '';
    if (!t.trim()) return ctx.reply('Usage: `/count <text>`', md);
    const words = (t.trim().match(/\S+/g) ?? []).length;
    const sentences = (t.match(/[.!?]+/g) ?? []).length;
    const lines = t.split(/\n/).length;
    return ctx.reply(
      `📊 *Counts*\nCharacters: ${t.length}\nNo spaces: ${t.replace(/\s/g, '').length}\nWords: ${words}\nSentences: ${sentences}\nLines: ${lines}`,
      md,
    );
  });

  bot.command('morse', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/morse <text or morse>`', md);
    // If it looks like morse, decode; else encode.
    if (/^[.\-/\s]+$/.test(t)) {
      const decoded = t
        .trim()
        .split(/\s+/)
        .map((c) => MORSE_REV[c] ?? '')
        .join('');
      return ctx.reply('📡 ' + (decoded || '❌ Could not decode'));
    }
    const encoded = [...t.toLowerCase()].map((c) => MORSE[c] ?? '').join(' ').trim();
    return ctx.reply('📡 ' + (encoded || '❌ Nothing to encode'));
  });

  bot.command('rot13', (ctx) => {
    const t = ctx.match?.toString();
    if (!t) return ctx.reply('Usage: `/rot13 <text>`', md);
    return ctx.reply(
      t.replace(/[a-z]/gi, (c) =>
        String.fromCharCode(((c.charCodeAt(0) & 31) + 12) % 26 + (c <= 'Z' ? 65 : 97)),
      ),
    );
  });

  bot.command('slug', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/slug My Article Title`', md);
    const slug = t
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');
    return ctx.reply('`' + slug + '`', md);
  });

  bot.command('json', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/json {"a":1}`', md);
    try {
      const pretty = JSON.stringify(JSON.parse(t), null, 2);
      if (pretty.length > 3500) return ctx.reply('✅ Valid JSON (too large to display).');
      return ctx.reply('✅ Valid JSON:\n```\n' + pretty + '\n```', md);
    } catch (e) {
      return ctx.reply('❌ Invalid JSON: ' + (e as Error).message);
    }
  });
}
