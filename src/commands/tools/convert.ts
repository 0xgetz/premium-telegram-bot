import { Bot } from 'grammy';
import * as chrono from 'chrono-node';

const md = { parse_mode: 'Markdown' as const };
const DAY = 86_400_000;

// --- unit conversion ---
const LENGTH: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
const WEIGHT: Record<string, number> = { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
function convTemp(v: number, from: string, to: string): number | null {
  let c: number;
  if (from === 'c') c = v;
  else if (from === 'f') c = (v - 32) * (5 / 9);
  else if (from === 'k') c = v - 273.15;
  else return null;
  if (to === 'c') return c;
  if (to === 'f') return c * (9 / 5) + 32;
  if (to === 'k') return c + 273.15;
  return null;
}

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

const TZ: Record<string, string> = {
  utc: 'UTC', london: 'Europe/London', paris: 'Europe/Paris', berlin: 'Europe/Berlin',
  newyork: 'America/New_York', ny: 'America/New_York', la: 'America/Los_Angeles',
  losangeles: 'America/Los_Angeles', chicago: 'America/Chicago', tokyo: 'Asia/Tokyo',
  jakarta: 'Asia/Jakarta', singapore: 'Asia/Singapore', sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai', delhi: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', moscow: 'Europe/Moscow',
  beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai', seoul: 'Asia/Seoul', toronto: 'America/Toronto',
};

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function registerConvertTools(bot: Bot): void {
  bot.command('convert', (ctx) => {
    const p = ctx.match?.toString().trim().toLowerCase().split(/\s+/) ?? [];
    if (p.length !== 3) return ctx.reply('Usage: `/convert 10 km mi` (length, weight, temp)', md);
    const val = parseFloat(p[0]);
    const from = p[1], to = p[2];
    if (isNaN(val)) return ctx.reply('❌ First argument must be a number.');
    let out: number | null = null;
    if (from in LENGTH && to in LENGTH) out = (val * LENGTH[from]) / LENGTH[to];
    else if (from in WEIGHT && to in WEIGHT) out = (val * WEIGHT[from]) / WEIGHT[to];
    else out = convTemp(val, from, to);
    if (out === null) return ctx.reply('❌ Units must be the same category (length / weight / temp).');
    return ctx.reply(`🔄 ${val} ${from} = *${Math.round(out * 10000) / 10000} ${to}*`, md);
  });

  bot.command('roman', (ctx) => {
    const t = ctx.match?.toString().trim().toUpperCase();
    if (!t) return ctx.reply('Usage: `/roman 2024` or `/roman MMXXIV`', md);
    if (/^\d+$/.test(t)) {
      let n = parseInt(t, 10);
      if (n < 1 || n > 3999) return ctx.reply('❌ Range is 1–3999.');
      let res = '';
      for (const [v, s] of ROMAN) while (n >= v) { res += s; n -= v; }
      return ctx.reply(`🏛 ${t} = *${res}*`, md);
    }
    if (/^[MDCLXVI]+$/.test(t)) {
      let n = 0;
      let i = 0;
      for (const [v, s] of ROMAN) while (t.startsWith(s, i)) { n += v; i += s.length; }
      return ctx.reply(`🏛 ${t} = *${n}*`, md);
    }
    return ctx.reply('❌ Enter a number (1–3999) or roman numerals.');
  });

  bot.command('base', (ctx) => {
    const p = ctx.match?.toString().trim().split(/\s+/) ?? [];
    if (p.length !== 3) return ctx.reply('Usage: `/base ff 16 10` (value fromBase toBase, 2–36)', md);
    const from = parseInt(p[1], 10), to = parseInt(p[2], 10);
    if (from < 2 || from > 36 || to < 2 || to > 36) return ctx.reply('❌ Bases must be 2–36.');
    const n = parseInt(p[0], from);
    if (isNaN(n)) return ctx.reply('❌ Value not valid in base ' + from);
    return ctx.reply(`🔢 ${p[0]} (base ${from}) = *${n.toString(to).toUpperCase()}* (base ${to})`, md);
  });

  bot.command('bmi', (ctx) => {
    const p = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const kg = parseFloat(p[0]), cm = parseFloat(p[1]);
    if (isNaN(kg) || isNaN(cm) || cm <= 0) return ctx.reply('Usage: `/bmi 70 175` (kg cm)', md);
    const bmi = kg / (cm / 100) ** 2;
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    return ctx.reply(`⚖️ BMI = *${bmi.toFixed(1)}* (${cat})`, md);
  });

  bot.command('split', (ctx) => {
    const p = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const total = parseFloat(p[0]), people = parseInt(p[1], 10), tip = parseFloat(p[2] || '0');
    if (isNaN(total) || isNaN(people) || people < 1) return ctx.reply('Usage: `/split 120 4 10` (total people tip%)', md);
    const grand = total * (1 + (isNaN(tip) ? 0 : tip) / 100);
    return ctx.reply(
      `🧾 Total: ${grand.toFixed(2)} (incl. ${tip || 0}% tip)\nPer person (${people}): *${(grand / people).toFixed(2)}*`,
      md,
    );
  });

  bot.command('pct', (ctx) => {
    const p = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const a = parseFloat(p[0]), b = parseFloat(p[1]);
    if (isNaN(a) || isNaN(b)) return ctx.reply('Usage: `/pct 20 150`', md);
    return ctx.reply(
      `📈 ${a}% of ${b} = *${(a / 100 * b).toFixed(2)}*\n${a} is *${(a / b * 100).toFixed(2)}%* of ${b}\n${a} → ${b} change: *${((b - a) / a * 100).toFixed(2)}%*`,
      md,
    );
  });

  bot.command('age', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/age 1995-08-21`', md);
    const d = chrono.parseDate(t);
    if (!d) return ctx.reply('❌ Could not parse that date.');
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const next = new Date(d); next.setFullYear(now.getFullYear());
    if (next < now) next.setFullYear(now.getFullYear() + 1); else if (next > now) years--;
    const daysToBday = Math.ceil((next.getTime() - now.getTime()) / DAY);
    return ctx.reply(`🎂 Age: *${years}* years\nNext birthday in *${daysToBday}* days.`, md);
  });

  bot.command('datediff', (ctx) => {
    const t = ctx.match?.toString().trim() ?? '';
    const res = chrono.parse(t);
    if (res.length < 2) return ctx.reply('Usage: `/datediff 2024-01-01 to 2024-12-31`', md);
    const days = Math.round((res[1].start.date().getTime() - res[0].start.date().getTime()) / DAY);
    return ctx.reply(`📅 *${Math.abs(days)}* days between those dates.`, md);
  });

  bot.command('color', (ctx) => {
    const t = ctx.match?.toString().trim();
    if (!t) return ctx.reply('Usage: `/color #ff5733`', md);
    const rgb = hexToRgb(t);
    if (!rgb) return ctx.reply('❌ Enter a hex color like `#ff5733`.', md);
    const [r, g, b] = rgb;
    const [h, s, l] = rgbToHsl(r, g, b);
    const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return ctx.reply(
      `🎨 *${hex.toUpperCase()}*\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${h}, ${s}%, ${l}%)`,
      md,
    );
  });

  bot.command('time', (ctx) => {
    const key = ctx.match?.toString().trim().toLowerCase().replace(/\s+/g, '');
    if (!key) return ctx.reply('Usage: `/time tokyo` (utc, london, ny, tokyo, jakarta, sydney…)', md);
    const tz = TZ[key];
    if (!tz) return ctx.reply('❌ Unknown city. Try: ' + Object.keys(TZ).slice(0, 12).join(', '));
    const now = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date());
    return ctx.reply(`🕐 *${key}* (${tz}):\n${now}`, md);
  });
}
