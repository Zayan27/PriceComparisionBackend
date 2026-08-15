/**
 * Simple structured logger with timestamps and log levels.
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, ...args) {
  const timestamp = formatTimestamp();
  const extra = args.length > 0 ? ' ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
  return `[${timestamp}] [${level}] ${message}${extra}`;
}

const logger = {
  info(message, ...args) {
    console.log(formatMessage(LOG_LEVELS.INFO, message, ...args));
  },

  warn(message, ...args) {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, ...args));
  },

  error(message, ...args) {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, ...args));
  },

  debug(message, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, message, ...args));
    }
  },
};

export default logger;
