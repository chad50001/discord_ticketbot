require('dotenv').config();
const { TicketClient } = require('./src/client');
const { version } = require('./package.json');
console.log(`[BOOT] discord-ticketbot v${version} starting...`);

const client = new TicketClient();
client.start().catch(err => {
  console.error('[FATAL] Bot failed to start:', err);
  process.exit(1);
});
