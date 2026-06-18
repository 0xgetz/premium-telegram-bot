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

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome & overview' },
    { command: 'tools', description: 'List every tool' },
    { command: 'gen', description: 'Generate marketing copy' },
    { command: 'remind', description: 'Set a reminder (natural language)' },
    { command: 'todo', description: 'To-do list' },
    { command: 'calc', description: 'Calculator' },
    { command: 'convert', description: 'Unit converter' },
    { command: 'qr', description: 'Generate a QR code' },
    { command: 'poll', description: 'Create a poll' },
    { command: 'habit', description: 'Habit streaks (premium)' },
    { command: 'status', description: 'Your plan' },
    { command: 'upgrade', description: 'Go premium' },
    { command: 'help', description: 'Show help' },
  ]);

  startReminderScheduler(bot);

  console.log('🤖 Bot is running...');
  await bot.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
