const ClaudeClient = require('./src/client');
const { getSessionKey, saveSessionKey, getConfigPath } = require('./src/config');

/**
 * Twórz instancję klienta Claude.
 *
 * @param {object} [options]
 * @param {string} [options.sessionKey]     - nadpisz session key ręcznie
 * @param {string} [options.conversationId] - kontynuuj istniejącą konwersację
 * @param {string} [options.model]           - model Claude (domyślnie: claude-3-5-sonnet-20241022)
 */
function createClient(options = {}) {
    return new ClaudeClient(options);
}

module.exports = ClaudeClient;
module.exports.createClient = createClient;
module.exports.getSessionKey = getSessionKey;
module.exports.saveSessionKey = saveSessionKey;
module.exports.getConfigPath = getConfigPath;
