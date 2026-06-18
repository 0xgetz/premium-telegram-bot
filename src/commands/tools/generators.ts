import { Bot } from 'grammy';
import crypto from 'node:crypto';

const md = { parse_mode: 'Markdown' as const };

const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  );

export function registerGeneratorTools(bot: Bot): void {
  bot.command('pw', (ctx) => {
    const len = Math.min(Math.max(parseInt(ctx.match?.toString().trim() || '16', 10) || 16, 4), 128);
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
    const bytes = crypto.randomBytes(len);
    let pw = '';
    for (let i = 0; i < len; i++) pw += charset[bytes[i] % charset.length];
    return ctx.reply('🔑 `' + pw + '`', md);
  });

  bot.command('uuid', (ctx) => ctx.reply('🆔 `' + crypto.randomUUID() + '`', md));

  bot.command('lorem', (ctx) => {
    const n = Math.min(Math.max(parseInt(ctx.match?.toString().trim() || '40', 10) || 40, 1), 300);
    const words: string[] = [];
    for (let i = 0; i < n; i++) words.push(LOREM[crypto.randomInt(LOREM.length)]);
    let text = words.join(' ');
    text = text.charAt(0).toUpperCase() + text.slice(1) + '.';
    return ctx.reply(text);
  });

  bot.command('pick', (ctx) => {
    const raw = ctx.match?.toString() ?? '';
    const opts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (opts.length < 2) return ctx.reply('Usage: `/pick pizza, sushi, tacos`', md);
    return ctx.reply('🎯 ' + opts[crypto.randomInt(opts.length)]);
  });

  bot.command('roll', (ctx) => {
    const spec = (ctx.match?.toString().trim() || '1d6').toLowerCase();
    const m = spec.match(/^(\d{1,2})?d(\d{1,3})$/);
    if (!m) return ctx.reply('Usage: `/roll 2d6` (NdM)', md);
    const n = Math.min(parseInt(m[1] || '1', 10), 20);
    const sides = Math.min(Math.max(parseInt(m[2], 10), 2), 1000);
    const rolls = Array.from({ length: n }, () => crypto.randomInt(1, sides + 1));
    const sum = rolls.reduce((a, b) => a + b, 0);
    return ctx.reply(`🎲 ${spec}: ${rolls.join(' + ')}${n > 1 ? ` = *${sum}*` : ''}`, md);
  });

  bot.command('flip', (ctx) =>
    ctx.reply(crypto.randomInt(2) ? '🪙 Heads' : '🪙 Tails'),
  );
}
