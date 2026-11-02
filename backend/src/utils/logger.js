/* eslint-disable no-console */
const stamp = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(stamp(), '[info]', ...args),
  warn: (...args) => console.warn(stamp(), '[warn]', ...args),
  error: (...args) => console.error(stamp(), '[error]', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log(stamp(), '[debug]', ...args);
  },
};

module.exports = logger;
