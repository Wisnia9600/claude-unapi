const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.claude-unapi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch { /* ignore */ }
  return {};
}

function writeConfig(data) {
  ensureConfigDir();
  const existing = readConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...data }, null, 2));
}

function getSessionKey() {
  // 1. Official env var from `claude setup-token`
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;

  // 2. Generic env var
  if (process.env.CLAUDE_SESSION_KEY) return process.env.CLAUDE_SESSION_KEY;

  // 3. .env file in current working directory
  try {
    const dotenvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, 'utf8');
      const oauthMatch = content.match(/^CLAUDE_CODE_OAUTH_TOKEN\s*=\s*(.+)$/m);
      if (oauthMatch) return oauthMatch[1].trim().replace(/^["']|["']$/g, '');
      const sessionMatch = content.match(/^CLAUDE_SESSION_KEY\s*=\s*(.+)$/m);
      if (sessionMatch) return sessionMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }

  // 4. Global config file (~/.claude-unapi/config.json)
  const config = readConfig();
  if (config.sessionKey) return config.sessionKey;

  throw new Error(
    '\n❌ No auth token found!\n\n' +
    '  Run the setup wizard:\n' +
    '    claude-unapi setup\n\n' +
    '  Or set manually:\n' +
    '    claude-unapi set-key sk-ant-oat01-...\n'
  );
}

function saveSessionKey(key) {
  writeConfig({ sessionKey: key });
}

function getConfigPath() {
  return CONFIG_FILE;
}

module.exports = { getSessionKey, saveSessionKey, getConfigPath, readConfig, writeConfig };
