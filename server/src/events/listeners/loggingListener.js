/**
 * Debug logging listener — registers on every known event and logs a
 * structured one-liner for observability.
 *
 * Disable by setting EVENT_BUS_LOG_LEVEL=silent in the environment.
 */
const EVENTS = require('../eventNames');

const register = (bus) => {
  const isSilent = (process.env.EVENT_BUS_LOG_LEVEL || '').toLowerCase() === 'silent';
  if (isSilent) return;

  for (const [, eventName] of Object.entries(EVENTS)) {
    bus.on(eventName, (payload) => {
      const tenant = payload.tenant?.slug || 'unknown';
      const { _event, _emittedAt, tenant: _t, ...rest } = payload;

      const details = Object.entries(rest)
        .map(([k, v]) => `${k}=${v}`)
        .join(' | ');

      console.log(
        `[event-bus] ${eventName} | tenant=${tenant}${details ? ' | ' + details : ''} | ${_emittedAt}`
      );
    });
  }
};

module.exports = { register };
