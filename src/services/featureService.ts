/**
 * Core "tool" logic — the value your bot delivers.
 *
 * Template-based so it runs with zero external API keys. Swap `generate()`
 * for your own logic (OpenAI, image generation, scraping, etc.); the tiers,
 * quota, and payment layers stay exactly the same.
 *
 * Free users get 2 quick variants. Premium users get 6 variants spread across
 * distinct marketing tones plus a suggested call-to-action — a clear, satisfying
 * upgrade rather than an artificial wall.
 */

interface ToneSet {
  tone: string;
  templates: string[];
}

const TONES: ToneSet[] = [
  { tone: 'Bold', templates: ['Stop wasting time on {t} — do it in seconds.', '{t} is broken. Here is the fix.'] },
  { tone: 'Curiosity', templates: ['The {t} hack nobody is talking about.', 'Most people get {t} wrong. Here is what works.'] },
  { tone: 'Aspirational', templates: ['How I 10x my {t} without burning out.', 'Turn {t} into your unfair advantage.'] },
  { tone: 'Simple', templates: ['{t}, but actually simple.', 'Finally, {t} that just works.'] },
  { tone: 'Urgency', templates: ['Fix your {t} before your competitors do.', "Your {t} is costing you money right now."] },
];

const CTAS = [
  'Try it free today.',
  'Get started in under a minute.',
  'Join thousands already using it.',
  'No credit card required.',
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GenerateResult {
  lines: string[];
}

export function generate(topic: string, premium: boolean): GenerateResult {
  const t = topic.trim() || 'your product';

  if (!premium) {
    // 2 quick, ungrouped variants for the free tier.
    const picks = [...TONES].sort(() => Math.random() - 0.5).slice(0, 2);
    const lines = picks.map((p) => rand(p.templates).replace(/\{t\}/g, t));
    return { lines };
  }

  // Premium: one strong line per tone, labeled, plus a CTA.
  const lines: string[] = [];
  for (const set of TONES) {
    lines.push(`*${set.tone}:* ${rand(set.templates).replace(/\{t\}/g, t)}`);
  }
  lines.push('', `💡 *Suggested CTA:* ${rand(CTAS)}`);
  return { lines };
}
