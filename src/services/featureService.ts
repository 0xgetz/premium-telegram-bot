/**
 * Core "tool" logic. This is the value your bot delivers.
 *
 * The demo implementation is a template-based marketing-copy generator so the
 * project runs with zero external API keys. Swap `generate()` for your own
 * logic (OpenAI, image generation, scraping, etc.) — the monetization,
 * quota, and payment layers stay exactly the same.
 */

const HOOKS = [
  'Stop wasting time on {topic} — do it in seconds.',
  'The {topic} hack nobody is talking about.',
  'How I 10x my {topic} without burning out.',
  '{topic}, but actually simple.',
  'Your {topic} workflow is broken. Here is the fix.',
  'Most people get {topic} wrong. Here is what works.',
];

const CTAS = [
  'Try it free today.',
  'Get started in under a minute.',
  'Join thousands already using it.',
  'No credit card required.',
];

function pick<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export interface GenerateResult {
  premiumOnly: boolean;
  lines: string[];
}

/** Free version returns a couple of variants; premium returns more + a CTA. */
export function generate(topic: string, premium: boolean): GenerateResult {
  const clean = topic.trim() || 'your product';
  const count = premium ? 5 : 2;
  const lines = pick(HOOKS, count).map((h) => h.replace(/\{topic\}/g, clean));

  if (premium) {
    const cta = pick(CTAS, 1)[0];
    lines.push('', `Suggested CTA: ${cta}`);
  }

  return { premiumOnly: false, lines };
}
