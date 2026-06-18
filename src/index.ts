import { Bot } from 'grammy';
import { config } from './config.js';
import { registerBasicCommands } from './commands/basic.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerReminderCommands } from './commands/reminders.js';
import { registerUtilityCommands } from './commands/utilities.js';
import { registerNotesCommands } from './commands/notes.js';
import { registerInlineMode } from './commands/inline.js';
import { registerAdminCommands } from './commands/admin.js';
import { startReminderScheduler } from './services/reminderService.js';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);

  registerBasicCommands(bot);
  registerGenerateCommand(bot);
  registerReminderCommands(bot);
  registerUtilityCommands(bot);
  registerNotesCommands(bot);
  registerInlineMode(bot);
  registerAdminCommands(bot);

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  await bot.api.setMyCommands([
    { command: 'gen', description: 'Generate marketing copy' },
    { command: 'remind', description: 'Set a reminder (natural language)' },
    { command: 'reminders', description: 'Manage your reminders' },
    { command: 'qr', description: 'Generate a QR code' },
    { command: 'sd', description: 'Self-destructing message' },
    { command: 'save', description: 'Save a personal note' },
    { command: 'notes', description: 'View your notes' },
    { command: 'help', description: 'Show help' },
  ]);

  // Fire persisted reminders even across restarts.
  startReminderScheduler(bot);

  console.log('🤖 Bot is running (100% free)...');
  await bot.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
