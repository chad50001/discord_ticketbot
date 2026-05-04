const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands }    = require('./handlers/commandHandler');
const { loadEvents }      = require('./handlers/eventHandler');
const { loadComponents }  = require('./handlers/componentHandler');
const { initDatabase }    = require('./database');
const { loadConfig, validateConfig } = require('./config');
const { checkApiKey }     = require('./utils/mskApi');
const logger = require('./utils/logger');

// ── Startup Banner ────────────────────────────────────────────────────────────

const TIER_COLORS = {
  basic:        '\x1b[90m',   // gray
  premium:      '\x1b[38;2;94;177;49m',  // green (accent)
  premium_plus: '\x1b[38;2;157;101;254m', // purple
};

const TIER_LABELS = {
  basic:        'Basic',
  premium:      'Premium',
  premium_plus: 'Premium+',
};

function printBanner() {
  const reset = '\x1b[0m';
  console.log('');
  // MSK – centered above TICKET BOT (24 spaces padding)
  console.log('\x1b[38;2;143;110;250m                        ███╗   ███╗███████╗██╗  ██╗');
  console.log('\x1b[38;2;150;100;250m                        ████╗ ████║██╔════╝██║ ██╔╝');
  console.log('\x1b[38;2;157;90;251m                        ██╔████╔██║███████╗█████╔╝ ');
  console.log('\x1b[38;2;165;80;251m                        ██║╚██╔╝██║╚════██║██╔═██╗ ');
  console.log('\x1b[38;2;172;70;252m                        ██║ ╚═╝ ██║███████║██║  ██╗');
  console.log('\x1b[38;2;179;60;252m                        ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝');
  // TICKET BOT
  console.log('\x1b[38;2;186;50;253m████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗');
  console.log('\x1b[38;2;193;40;253m╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝');
  console.log('\x1b[38;2;200;30;254m   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   ');
  console.log('\x1b[38;2;207;20;254m   ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║       ██╔══██╗██║   ██║   ██║   ');
  console.log('\x1b[38;2;214;10;255m   ██║   ██║╚██████╗██║  ██╗███████╗   ██║       ██████╔╝╚██████╔╝   ██║   ');
  console.log('\x1b[38;2;222;0;255m   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝' + reset);
  console.log(`\x1b[90m                 https://github.com/MSK-Scripts/discord_ticketbot${reset}`);
  console.log('');
}

async function printApiKeyStatus() {
  const reset = '\x1b[0m';
  const gray  = '\x1b[90m';
  process.stdout.write(`${gray}Checking API Key...${reset} `);

  const { status, tier } = await checkApiKey();

  if (status === 'not_configured') {
    console.log(`\x1b[90mKein API Key konfiguriert → Basic${reset}`);
  } else if (status === 'invalid') {
    console.log(`\x1b[31mAPI Key ungültig → Basic${reset}`);
  } else if (status === 'unreachable') {
    console.log(`\x1b[33mMSK-Server nicht erreichbar → Basic${reset}`);
  } else {
    const color = TIER_COLORS[tier] ?? '\x1b[32m';
    const label = TIER_LABELS[tier] ?? tier;
    console.log(`${color}API Key gültig → ${label}${reset}`);
  }
}

class TicketClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    /** @type {Collection<string, object>} Slash commands */
    this.commands = new Collection();

    /** @type {Collection<string, object>} Button / modal / menu handlers */
    this.components = new Collection();

    this.logger = logger;
    this.config = null;
    this.db     = null;
    this.locale = null;
  }

  async start() {
    printBanner();

    // Check API Key status before connecting
    await printApiKeyStatus();
    console.log('');

    const reset = '\x1b[0m';
    const gray  = '\x1b[90m';
    process.stdout.write(`${gray}Connecting to Discord...${reset}\n`);
    console.log('');

    // Load & validate config
    this.config = loadConfig();
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      this.logger.error('Config validation failed:');
      configErrors.forEach(e => this.logger.error(`  - ${e}`));
      process.exit(1);
    }

    // Load locale — __dirname is src/, so ../locales/ is correct
    const localePath = `../locales/${this.config.lang}.json`;
    try {
      this.locale = require(localePath);
    } catch {
      this.logger.warn(`Locale "${this.config.lang}" not found, falling back to "en".`);
      this.locale = require('../locales/en.json');
    }

    // Init database
    this.db = initDatabase();
    this.logger.info('Database initialized.');

    // Load handlers
    await loadCommands(this);
    await loadEvents(this);
    await loadComponents(this);

    // Login
    await this.login(process.env.TOKEN);
  }

  /**
   * Translate a locale key with variable substitution.
   * @param {string} keyPath  Dot-separated path, e.g. "messages.ticketCreated"
   * @param {object} vars     Variables to replace, e.g. { channel: '#ticket-1' }
   * @returns {string}
   */
  t(keyPath, vars = {}) {
    const keys = keyPath.split('.');
    let value  = this.locale;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return keyPath;
    }
    if (typeof value !== 'string') return keyPath;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, v),
      value
    );
  }

  /**
   * Check if a member has staff access.
   * Optionally checks against a ticket type's specific staffRoles.
   *
   * @param {import('discord.js').GuildMember} member
   * @param {object|null} ticketType  Optional ticket type config entry
   * @returns {boolean}
   */
  isStaff(member, ticketType = null) {
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;

    // If the ticket type has its own staffRoles, check those first
    if (ticketType?.staffRoles?.length > 0) {
      if (ticketType.staffRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    }

    // Fall back to global staff roles
    const globalRoles = this.config.rolesWhoHaveAccessToTheTickets ?? [];
    return globalRoles.some(roleId => member.roles.cache.has(roleId));
  }
}

module.exports = { TicketClient };
