import { Bot } from 'grammy';
import { config } from './config.js';
import { registerBasicCommands } from './commands/basic.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerPaymentCommands } from './commands/payments.js';
import { registerAdminCommands } from './commands/admin.js';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);

  registerBasicCommands(bot);
  registerGenerateCommand(bot);
  registerPaymentCommands(bot);
  registerAdminCommands(bot);

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  await bot.api.setMyCommands([
    { command: 'gen', description: 'Generate marketing copy' },
    { command: 'status', description: 'Your plan & remaining uses' },
    { command: 'upgrade', description: 'Unlock unlimited premium' },
    { command: 'help', description: 'Show help' },
  ]);

  console.log('🤖 Bot is running...');
  await bot.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
