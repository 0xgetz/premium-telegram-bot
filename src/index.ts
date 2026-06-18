import { Bot } from 'grammy';
import { config } from './config.js';
import { registerBasicCommands } from './commands/basic.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerReminderCommands } from './commands/reminders.js';
import { registerUtilityCommands } from './commands/utilities.js';
import { registerNotesCommands } from './commands/notes.js';
import { registerInlineMode } from './commands/inline.js';
import { registerPaymentCommands } from './commands/payments.js';
import { registerAdminCommands } from './commands/admin.js';
import { registerTextTools } from './commands/tools/text.js';
import { registerGeneratorTools } from './commands/tools/generators.js';
import { registerConvertTools } from './commands/tools/convert.js';
import { registerProductivity } from './commands/productivity.js';
import { registerPremiumTools } from './commands/premiumTools.js';
import { registerMediaCommands } from './commands/media.js';
import { registerGemCommands, startGemAlertScheduler } from './commands/gems.js';
import { startReminderScheduler } from './services/reminderService.js';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);

  // Core
  registerBasicCommands(bot);
  registerGenerateCommand(bot);
  registerReminderCommands(bot);
  registerUtilityCommands(bot);
  registerNotesCommands(bot);
  registerInlineMode(bot);
  registerPaymentCommands(bot);
  registerAdminCommands(bot);

  // 30+ extra tools
  registerTextTools(bot);
  registerGeneratorTools(bot);
  registerConvertTools(bot);
  registerProductivity(bot);
  registerPremiumTools(bot);

  // Media downloaders + EVM gems tracker
  registerMediaCommands(bot);
  registerGemCommands(bot);

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome & overview' },
    { command: 'tools', description: 'List every tool' },
    { command: 'gen', description: 'Generate marketing copy' },
    { command: 'mp3', description: 'Download audio from a link' },
    { command: 'video', description: 'Download a video from a link' },
    { command: 'gem', description: 'EVM token stats (gems tracker)' },
    { command: 'scan', description: 'Honeypot + buy/hold analysis' },
    { command: 'honeypot', description: 'Quick can-I-sell check' },
    { command: 'gems', description: 'Trending EVM gems' },
    { command: 'remind', description: 'Set a reminder (natural language)' },
    { command: 'todo', description: 'To-do list' },
    { command: 'calc', description: 'Calculator' },
    { command: 'qr', description: 'Generate a QR code' },
    { command: 'watch', description: 'Watch a token for alerts (premium)' },
    { command: 'status', description: 'Your plan' },
    { command: 'upgrade', description: 'Go premium' },
    { command: 'help', description: 'Show help' },
  ]);

  startReminderScheduler(bot);
  startGemAlertScheduler(bot);

  console.log('🤖 Bot is running...');
  await bot.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
