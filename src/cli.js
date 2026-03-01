#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { saveSessionKey, getSessionKey, getConfigPath, readConfig, writeConfig } = require('./config');
const ClaudeClient = require('./client');
const { listModels, resolveModel, DEFAULT_MODEL } = require('./client');

const program = new Command();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function isWindows() {
    return process.platform === 'win32';
}

function hr(char = '─', width = 58) {
    return char.repeat(width);
}

function box(lines, width = 58) {
    const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
    console.log('╔' + '═'.repeat(width) + '╗');
    for (const line of lines) {
        if (line === '---') {
            console.log('╠' + '═'.repeat(width) + '╣');
        } else {
            console.log('║ ' + pad(line, width - 2) + ' ║');
        }
    }
    console.log('╚' + '═'.repeat(width) + '╝');
}

// ─── Program ──────────────────────────────────────────────────────────────────

program
    .name('claude-unapi')
    .description('Unofficial Claude Pro API — use your subscription in any project')
    .version('1.2.0')
    .addHelpText('after', `
Examples:
  $ claude-unapi setup                    Interactive setup wizard
  $ claude-unapi ask "Hello Claude"       Quick question
  $ claude-unapi ask "Explain this" --file code.py --model haiku
  $ claude-unapi chat                     Interactive chat
  $ claude-unapi chat --model opus        Chat with a specific model
  $ claude-unapi models                   List available models
  $ claude-unapi config                   Show current configuration
`);

// ─── setup ────────────────────────────────────────────────────────────────────
program
    .command('setup')
    .description('Interactive setup wizard — get token, configure, test connection')
    .action(async () => {
        box([
            '  Claude Unofficial API — Setup Wizard  ',
            '---',
            '',
            '  This tool lets you use your Claude Pro subscription',
            '  in any project or script.',
            '',
        ]);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        // Step 1: Detect existing token
        let existingToken = null;
        try { existingToken = getSessionKey(); } catch { }

        if (existingToken) {
            const masked = existingToken.substring(0, 18) + '...' + existingToken.slice(-4);
            const type = existingToken.startsWith('sk-ant-oat01-') ? 'OAuth (claude setup-token)' : 'Session cookie';
            console.log(`\n✅ Existing token found [${type}]: ${masked}`);
            const reuse = await ask(rl, '   Use existing token? (Y/n): ');
            if (reuse.trim().toLowerCase() !== 'n') {
                console.log('\n🔄 Testing connection...');
                try {
                    const claude = new ClaudeClient();
                    await claude.sendMessage('Reply with one word: working');
                    console.log('✅ Connection successful!\n');
                    await _setupFinish(rl);
                    rl.close();
                    return;
                } catch (err) {
                    console.log('❌ Token is not working. Please set a new one.\n');
                }
            }
        }

        // Step 2: Choose token method
        console.log('\n📋 How would you like to authenticate?\n');
        console.log('  [1] claude setup-token  (RECOMMENDED — OAuth, valid for 1 year)');
        console.log('  [2] Session cookie from browser (claude.ai)');
        console.log('  [3] Paste token manually\n');
        const choice = await ask(rl, 'Choose option [1/2/3]: ');

        if (choice.trim() === '1') {
            console.log('\n──────────────────────────────────────────────────────');
            console.log('  Run in a NEW terminal window:');
            console.log('\n    claude setup-token\n');
            console.log('  Copy the generated token (starts with sk-ant-oat01-)');
            console.log('──────────────────────────────────────────────────────\n');
        } else if (choice.trim() === '2') {
            console.log('\n──────────────────────────────────────────────────────');
            console.log('  1. Open https://claude.ai (log in)');
            console.log('  2. F12 → Application/Storage → Cookies → claude.ai');
            console.log('  3. Find: sessionKey  (sk-ant-sid01-...)');
            console.log('──────────────────────────────────────────────────────\n');
        }

        const token = await ask(rl, '🔑 Paste your token: ');
        const trimmed = token.trim();

        if (!trimmed) {
            console.error('❌ No token provided. Run setup again.');
            rl.close();
            return;
        }

        if (!trimmed.startsWith('sk-ant-oat01-') && !trimmed.startsWith('sk-ant-sid01-')) {
            console.warn('⚠️  Token looks unusual. Proceeding anyway...');
        }

        saveSessionKey(trimmed);
        const tokenType = trimmed.startsWith('sk-ant-oat01-') ? 'OAuth' : 'Session cookie';
        console.log(`\n✅ Token [${tokenType}] saved!`);

        // Step 3: Test connection
        console.log('\n🔄 Testing connection to Claude...');
        try {
            const claude = new ClaudeClient();
            const res = await claude.sendMessage('Reply with one word: working');
            console.log(`✅ Connection successful! (response: "${res.trim()}")`);
        } catch (err) {
            console.error('❌ Connection failed:', err.response?.data?.error?.message || err.message);
            console.log('\n💡 Check your token and try again: claude-unapi setup');
            rl.close();
            return;
        }

        await _setupFinish(rl);
        rl.close();
    });

async function _setupFinish(rl) {
    console.log('\n' + hr('─') + '\n');
    const model = await ask(rl, `🤖 Default model? [Enter = sonnet / opus / haiku]: `);
    const resolved = model.trim() ? resolveModel(model.trim()) : DEFAULT_MODEL;
    writeConfig({ defaultModel: resolved });
    console.log(`   Default model set: ${resolved}`);

    console.log('\n' + hr('─'));
    console.log('\n🎉 Setup complete! You can now use:\n');
    console.log('   claude-unapi ask "Write a function..."');
    console.log('   claude-unapi chat');
    console.log('   claude-unapi --help\n');

    const showPath = await ask(rl, '📖 Show usage instructions for projects? (Y/n): ');
    if (showPath.trim().toLowerCase() !== 'n') {
        _showUsageInstructions();
    }
}

function _showUsageInstructions() {
    const pkgPath = path.join(__dirname, '..').replace(/\\/g, '/');
    console.log('\n' + hr('─'));
    console.log('\n📦 How to use in your projects:\n');
    console.log('  Option A: GitHub dependency (recommended)');
    console.log('  ─────────────────────────────────────────');
    console.log('  npm install github:Wisnia9600/claude-unapi\n');
    console.log('  Option B: Local dependency (package.json)');
    console.log('  ─────────────────────────────────────────');
    console.log(`  "dependencies": { "claude-unapi": "file:${pkgPath}" }`);
    console.log('  Then: npm install\n');
    console.log('  Usage:');
    console.log('  ──────');
    console.log("  const Claude = require('claude-unapi');");
    console.log("  const claude = new Claude({ model: 'sonnet' });");
    console.log("  const res = await claude.sendMessage('Hey!');");
    console.log("  // Streaming:");
    console.log("  await claude.streamMessage('...', chunk => process.stdout.write(chunk));");
    console.log("  // With file:");
    console.log("  await claude.sendMessage('Analyze this', { files: ['./code.py'] });\n");
}

// ─── set-key ──────────────────────────────────────────────────────────────────
program
    .command('set-key <token>')
    .description('Save auth token directly (skip setup wizard)')
    .action((token) => {
        if (!token.startsWith('sk-ant-oat01-') && !token.startsWith('sk-ant-sid01-')) {
            console.warn('⚠️  Token should start with "sk-ant-oat01-" (OAuth) or "sk-ant-sid01-" (cookie).');
        }
        saveSessionKey(token);
        const type = token.startsWith('sk-ant-oat01-') ? 'OAuth (1 year)' : 'Session cookie';
        console.log(`✅ Token saved [${type}] → ${getConfigPath()}`);
    });

// ─── config ───────────────────────────────────────────────────────────────────
program
    .command('config')
    .description('View or edit configuration')
    .option('--set-model <model>', 'Set default model')
    .option('--set-max-tokens <n>', 'Set default max tokens')
    .option('--show-key', 'Show full token (unmasked)')
    .option('--reset', 'Reset all config to defaults')
    .action(async (options) => {
        if (options.reset) {
            fs.writeFileSync(getConfigPath(), JSON.stringify({}, null, 2));
            console.log('✅ Config reset to defaults.');
            return;
        }

        const cfg = readConfig();
        let changed = false;

        if (options.setModel) {
            const m = resolveModel(options.setModel);
            writeConfig({ defaultModel: m });
            console.log(`✅ Default model: ${m}`);
            changed = true;
        }
        if (options.setMaxTokens) {
            writeConfig({ maxTokens: Number(options.setMaxTokens) });
            console.log(`✅ Max tokens: ${options.setMaxTokens}`);
            changed = true;
        }
        if (changed) return;

        console.log('\n📋 claude-unapi configuration\n');
        console.log(`  Config file:  ${getConfigPath()}`);

        try {
            const key = getSessionKey();
            if (options.showKey) {
                console.log(`  Token:        ${key}`);
            } else {
                const masked = key.substring(0, 18) + '...' + key.slice(-4);
                const type = key.startsWith('sk-ant-oat01-') ? 'OAuth' : 'Cookie';
                console.log(`  Token:        ${masked} [${type}]`);
            }
        } catch {
            console.log('  Token:        ❌ not set — run: claude-unapi setup');
        }

        const freshCfg = readConfig();
        console.log(`  Model:        ${freshCfg.defaultModel || DEFAULT_MODEL}`);
        console.log(`  Max tokens:   ${freshCfg.maxTokens || 8096}`);
        console.log(`  Node:         ${process.version}`);
        console.log(`  Platform:     ${process.platform} (${os.arch()})`);
        console.log(`  Config dir:   ${path.dirname(getConfigPath())}`);
        console.log();
        console.log('  Options: --set-model <opus|sonnet|haiku>  --set-max-tokens <n>  --reset');
        console.log();
    });

// ─── models ───────────────────────────────────────────────────────────────────
program
    .command('models')
    .description('List all available Claude models')
    .action(() => {
        const cfg = readConfig();
        const currentDefault = cfg.defaultModel || DEFAULT_MODEL;

        console.log('\n📋 Available Claude models:\n');
        const groups = [
            { label: 'Opus   (most capable)', models: ['claude-opus-4-6', 'claude-opus-4-5-20251101', 'claude-opus-4-1-20250805'] },
            { label: 'Sonnet (balanced)', models: ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4'] },
            { label: 'Haiku  (fastest/cheapest)', models: ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022'] },
        ];
        for (const g of groups) {
            console.log(`  ${g.label}`);
            for (const m of g.models) {
                const def = m === currentDefault ? ' ← default' : '';
                console.log(`    ${m}${def}`);
            }
        }
        console.log('\n  Aliases:');
        console.log('    opus    →  claude-opus-4-6');
        console.log('    sonnet  →  claude-sonnet-4-6');
        console.log('    haiku   →  claude-haiku-4-5-20251001');
        console.log('\n  Change default:');
        console.log('    claude-unapi config --set-model haiku\n');
    });

// ─── test ─────────────────────────────────────────────────────────────────────
program
    .command('test')
    .description('Test Claude connection')
    .option('-m, --model <model>', 'Model to use', null)
    .action(async (options) => {
        try {
            const cfg = readConfig();
            const modelArg = options.model || cfg.defaultModel || DEFAULT_MODEL;
            const modelName = resolveModel(modelArg);
            console.log(`🔄 Testing connection to Claude (${modelName})...`);
            const claude = new ClaudeClient({ model: modelArg });
            const response = await claude.sendMessage('Reply with one word: working');
            console.log(`✅ Connection successful! Response: "${response.trim()}"`);
        } catch (err) {
            console.error('❌ Error:', err.response?.data?.error?.message || err.message);
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.error('\n💡 Token is invalid or expired.');
                console.error('   Run: claude-unapi setup');
            }
        }
    });

// ─── ask ──────────────────────────────────────────────────────────────────────
program
    .command('ask <message>')
    .description('Send a single message to Claude')
    .option('-m, --model <model>', 'Model (opus/sonnet/haiku or full name)', null)
    .option('-f, --file <path>', 'Attach a file (repeatable)', (v, list) => { list.push(v); return list; }, [])
    .option('-t, --max-tokens <n>', 'Max response tokens', null)
    .option('--no-stream', 'Wait for full response (no streaming)')
    .action(async (message, options) => {
        try {
            const cfg = readConfig();
            const model = options.model || cfg.defaultModel || DEFAULT_MODEL;
            const maxTokens = options.maxTokens ? Number(options.maxTokens) : (cfg.maxTokens || 8096);
            const claude = new ClaudeClient({ model, maxTokens });
            const files = options.file || [];

            if (files.length) {
                console.log(`📎 Files: ${files.map(f => path.basename(f)).join(', ')}`);
            }

            if (options.stream !== false) {
                await claude.streamMessage(message, (chunk) => process.stdout.write(chunk), { files });
                console.log();
            } else {
                const res = await claude.sendMessage(message, { files });
                console.log(res);
            }
        } catch (err) {
            console.error('❌ Error:', err.response?.data?.error?.message || err.message);
        }
    });

// ─── chat ─────────────────────────────────────────────────────────────────────
program
    .command('chat')
    .description('Interactive chat session in the terminal')
    .option('-m, --model <model>', 'Model (opus/sonnet/haiku)', null)
    .option('--no-stream', 'Disable streaming')
    .action(async (options) => {
        const cfg = readConfig();
        const modelArg = options.model || cfg.defaultModel || DEFAULT_MODEL;
        let currentModel;

        try {
            currentModel = resolveModel(modelArg);
        } catch (e) {
            console.error('❌', e.message);
            process.exit(1);
        }

        let claude;
        try {
            claude = new ClaudeClient({ model: modelArg });
            if (!claude._isOAuth) {
                await claude._getOrganizationId();
            } else {
                await claude.sendMessage('ping');
                claude.newConversation();
            }
        } catch (err) {
            console.error('❌ Init error:', err.response?.data?.error?.message || err.message);
            console.error('   Run: claude-unapi setup');
            process.exit(1);
        }

        box([
            `  🤖 Claude Chat — ${currentModel}  `,
            '---',
            '  /new          Start new conversation (clears context)',
            '  /model <name> Switch model mid-chat',
            '  /model?       Show current model',
            '  /file <path>  Attach file to next message',
            '  /help         Show commands',
            '  /exit         Quit',
        ]);
        console.log();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'You> ',
        });

        let pendingFiles = [];
        rl.prompt();

        rl.on('line', async (line) => {
            const msg = line.trim();
            if (!msg) { rl.prompt(); return; }

            if (msg === '/exit' || msg === '/quit' || msg === '/q') {
                console.log('\n👋 Bye!');
                process.exit(0);
            }
            if (msg === '/new') {
                claude.newConversation();
                console.log(`\n✅ New conversation started — model: ${claude.model}\n`);
                rl.prompt();
                return;
            }
            if (msg === '/model?') {
                console.log(`\n📌 Model: ${claude.model}\n`);
                rl.prompt();
                return;
            }
            if (msg.startsWith('/model ')) {
                const newModel = msg.slice(7).trim();
                try {
                    const resolved = resolveModel(newModel);
                    claude.model = resolved;
                    console.log(`\n✅ Model → ${resolved}\n`);
                } catch (e) { console.error(`\n❌ ${e.message}\n`); }
                rl.prompt();
                return;
            }
            if (msg.startsWith('/file ')) {
                const filePath = msg.slice(6).trim();
                if (!fs.existsSync(filePath)) {
                    console.error(`\n❌ File not found: ${filePath}\n`);
                } else {
                    pendingFiles.push(filePath);
                    console.log(`\n📎 File queued: ${path.basename(filePath)} (will be sent with next message)\n`);
                }
                rl.prompt();
                return;
            }
            if (msg === '/help') {
                console.log('\n  Commands: /new /model <name> /model? /file <path> /exit\n');
                rl.prompt();
                return;
            }
            if (msg.startsWith('/')) {
                console.log('\n❓ Unknown command. Type /help\n');
                rl.prompt();
                return;
            }

            try {
                const files = [...pendingFiles];
                pendingFiles = [];
                if (files.length) console.log(`📎 Sending with files: ${files.map(f => path.basename(f)).join(', ')}`);

                process.stdout.write('\nClaude> ');
                if (options.stream !== false) {
                    await claude.streamMessage(msg, (chunk) => process.stdout.write(chunk), { files });
                } else {
                    const response = await claude.sendMessage(msg, { files });
                    process.stdout.write(response);
                }
                console.log('\n');
            } catch (err) {
                console.error('\n❌ Error:', err.response?.data?.error?.message || err.message, '\n');
            }

            rl.prompt();
        });

        rl.on('close', () => { console.log('\n👋 Bye!'); process.exit(0); });
    });

// ─── install-path ─────────────────────────────────────────────────────────────
program
    .command('install-path')
    .description('Show how to install globally or use in projects')
    .action(() => {
        const pkgDir = path.resolve(__dirname, '..');
        const pkgDirUnix = pkgDir.replace(/\\/g, '/');

        box([
            '  Installation & Usage in Projects  ',
            '---',
            '',
            '  ① Global install (recommended):',
            '',
            '    npm install -g github:Wisnia9600/claude-unapi',
            '',
            '  Then just run: claude-unapi <command>',
            '',
            '---',
            '',
            '  ② Local project dependency:',
            '',
            '    npm install github:Wisnia9600/claude-unapi',
            '',
            '    const Claude = require(\'claude-unapi\');',
            '',
            '---',
            '',
            '  ③ Local path (offline):',
            '',
            `    "claude-unapi": "file:${pkgDirUnix}"`,
            '',
            isWindows()
                ? `  Alias: Set-Alias claude-unapi 'node ${pkgDirUnix}/src/cli.js'`
                : `  Alias: alias claude-unapi='node ${pkgDirUnix}/src/cli.js'`,
            '',
        ]);
    });

// ─── commands ─────────────────────────────────────────────────────────────────
program
    .command('commands')
    .description('Show all available commands with examples')
    .action(() => {
        console.log('\n📚 Claude Unofficial API — All Commands\n');

        const commands = [
            ['setup', 'Interactive setup wizard (start here)', 'claude-unapi setup'],
            ['set-key', 'Save token directly', 'claude-unapi set-key sk-ant-oat01-...'],
            ['config', 'Show / edit configuration', 'claude-unapi config'],
            ['config', 'Set default model', 'claude-unapi config --set-model haiku'],
            ['config', 'Set max tokens', 'claude-unapi config --set-max-tokens 4096'],
            ['config', 'Reset config', 'claude-unapi config --reset'],
            ['models', 'List available Claude models', 'claude-unapi models'],
            ['test', 'Test connection', 'claude-unapi test'],
            ['test', 'Test with specific model', 'claude-unapi test --model opus'],
            ['ask', 'One-shot question', 'claude-unapi ask "Write hello world in Python"'],
            ['ask', 'With file attachment', 'claude-unapi ask "Explain this code" -f main.py'],
            ['ask', 'Multiple files + model', 'claude-unapi ask "Compare" -f a.js -f b.js -m opus'],
            ['ask', 'No streaming', 'claude-unapi ask "..." --no-stream'],
            ['chat', 'Interactive chat session', 'claude-unapi chat'],
            ['chat', 'Chat with specific model', 'claude-unapi chat --model sonnet'],
            ['install-path', 'Show install / project usage instructions', 'claude-unapi install-path'],
            ['how-to', 'How to get auth token from browser', 'claude-unapi how-to'],
            ['commands', 'This list', 'claude-unapi commands'],
        ];

        let lastCmd = '';
        for (const [cmd, desc, example] of commands) {
            if (cmd !== lastCmd) {
                console.log(`  ${hr('─', 54)}`);
                lastCmd = cmd;
            }
            console.log(`  \x1b[36m${cmd}\x1b[0m  ${desc}`);
            console.log(`  \x1b[90m$ ${example}\x1b[0m`);
        }
        console.log(`  ${hr('─', 54)}\n`);

        console.log('  In-chat commands (claude-unapi chat):');
        console.log('    /new           Start new conversation');
        console.log('    /model <name>  Switch model');
        console.log('    /file <path>   Attach file to next message');
        console.log('    /exit          Quit chat\n');
    });

// ─── how-to ───────────────────────────────────────────────────────────────────
program
    .command('how-to')
    .description('Instructions for getting auth token from browser')
    .action(() => {
        box([
            '  How to get your auth token  ',
            '---',
            '',
            '  ✅ OPTION 1 — OAuth (recommended, valid 1 year):',
            '',
            '  1. npm install -g @anthropic-ai/claude-code',
            '  2. claude setup-token',
            '  3. Copy token (sk-ant-oat01-...)',
            '  4. claude-unapi set-key sk-ant-oat01-...',
            '',
            '---',
            '',
            '  🌐 OPTION 2 — Session cookie from browser:',
            '',
            '  1. Open https://claude.ai (log in)',
            '  2. F12 → Application → Cookies → claude.ai',
            '     (Firefox: Storage → Cookies)',
            '  3. Copy: sessionKey (sk-ant-sid01-...)',
            '  4. claude-unapi set-key sk-ant-sid01-...',
            '',
            '  ⚠️  Never share your token with anyone!',
            '',
        ]);
    });

program.parse();
