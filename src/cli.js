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
    .description('Unofficial Claude Pro API — use your subscription in code')
    .version('1.2.0')
    .addHelpText('after', `
Examples:
  $ claude-unapi setup                    Interactive setup wizard
  $ claude-unapi ask "Hello Claude"       Quick question
  $ claude-unapi ask "Explain this" --file code.py --model haiku
  $ claude-unapi chat                     Interactive chat
  $ claude-unapi chat --model opus
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
            '  in code without paying for the official API.',
            '',
        ]);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        // ── Step 1: Detect existing token ──
        let existingToken = null;
        try { existingToken = getSessionKey(); } catch { }

        if (existingToken) {
            const masked = existingToken.substring(0, 18) + '...' + existingToken.slice(-4);
            const type = existingToken.startsWith('sk-ant-oat01-') ? 'OAuth (claude setup-token)' : 'Session cookie';
            console.log(`\n✅ Znaleziono zapisany token [${type}]: ${masked}`);
            const reuse = await ask(rl, '   Użyć istniejącego tokena? (T/n): ');
            if (reuse.trim().toLowerCase() !== 'n') {
                console.log('\n🔄 Testuję połączenie...');
                try {
                    const claude = new ClaudeClient();
                    await claude.sendMessage('Reply with one word: working');
                    console.log('✅ Połączenie działa!\n');
                    await _setupFinish(rl);
                    rl.close();
                    return;
                } catch (err) {
                    console.log('❌ Token nie działa. Trzeba ustawić nowy.\n');
                }
            }
        }

        // ── Step 2: Choose token method ──
        console.log('\n📋 Jak chcesz się zalogować?\n');
        console.log('  [1] claude setup-token  (ZALECANE — OAuth, ważny 1 rok)');
        console.log('  [2] Session cookie z przeglądarki (claude.ai)');
        console.log('  [3] Wklej token ręcznie\n');
        const choice = await ask(rl, 'Wybierz opcję [1/2/3]: ');

        if (choice.trim() === '1') {
            console.log('\n──────────────────────────────────────────────────────');
            console.log('  Uruchom w NOWYM oknie terminala:');
            console.log('\n    claude setup-token\n');
            console.log('  Skopiuj token (zaczyna się od sk-ant-oat01-)');
            console.log('──────────────────────────────────────────────────────\n');
        } else if (choice.trim() === '2') {
            console.log('\n──────────────────────────────────────────────────────');
            console.log('  1. Otwórz https://claude.ai (zaloguj się)');
            console.log('  2. F12 → Application/Storage → Cookies → claude.ai');
            console.log('  3. Znajdź: sessionKey  (sk-ant-sid01-...)');
            console.log('──────────────────────────────────────────────────────\n');
        }

        const token = await ask(rl, '🔑 Wklej token: ');
        const trimmed = token.trim();

        if (!trimmed) {
            console.error('❌ Nie podano tokena. Uruchom setup ponownie.');
            rl.close();
            return;
        }

        if (!trimmed.startsWith('sk-ant-oat01-') && !trimmed.startsWith('sk-ant-sid01-')) {
            console.warn('⚠️  Token wygląda nieprawidłowo. Próbuję mimo to...');
        }

        saveSessionKey(trimmed);
        const tokenType = trimmed.startsWith('sk-ant-oat01-') ? 'OAuth' : 'Session cookie';
        console.log(`\n✅ Token [${tokenType}] zapisany!`);

        // ── Step 3: Test connection ──
        console.log('\n🔄 Testuję połączenie z Claude...');
        try {
            const claude = new ClaudeClient();
            const res = await claude.sendMessage('Reply with one word: working');
            console.log(`✅ Połączenie działa! (odpowiedź: "${res.trim()}")`);
        } catch (err) {
            console.error('❌ Błąd połączenia:', err.response?.data?.error?.message || err.message);
            console.log('\n💡 Sprawdź token i spróbuj ponownie: claude-unapi setup');
            rl.close();
            return;
        }

        await _setupFinish(rl);
        rl.close();
    });

async function _setupFinish(rl) {
    console.log('\n' + hr('─') + '\n');
    const model = await ask(rl, `🤖 Domyślny model? [Enter = sonnet / opus / haiku]: `);
    const resolved = model.trim() ? resolveModel(model.trim()) : DEFAULT_MODEL;
    writeConfig({ defaultModel: resolved });
    console.log(`   Default model ustawiony: ${resolved}`);

    console.log('\n' + hr('─'));
    console.log('\n🎉 Setup zakończony! Możesz teraz używać:\n');
    console.log('   claude-unapi ask "Napisz funkcję..."');
    console.log('   claude-unapi chat');
    console.log('   claude-unapi --help\n');

    const showPath = await ask(rl, '📖 Pokaż instrukcję użycia w projektach? (T/n): ');
    if (showPath.trim().toLowerCase() !== 'n') {
        _showUsageInstructions();
    }
}

function _showUsageInstructions() {
    const pkgPath = path.join(__dirname, '..').replace(/\\/g, '/');
    console.log('\n' + hr('─'));
    console.log('\n📦 Jak używać w swoich projektach:\n');
    console.log('  Option A: Lokalna zależność (package.json)');
    console.log('  ─────────────────────────────────────────');
    console.log('  Dodaj do package.json twojego projektu:');
    console.log(`\n    "dependencies": { "claude-unapi": "file:${pkgPath}" }`);
    console.log('\n  Potem: npm install\n');
    console.log('  Option B: Ścieżka bezpośrednia w require()');
    console.log('  ─────────────────────────────────────────');
    console.log(`  const Claude = require('${pkgPath}');\n`);
    console.log('  Przykład użycia:');
    console.log('  ────────────────');
    console.log("  const Claude = require('claude-unapi');");
    console.log("  const claude = new Claude({ model: 'sonnet' });");
    console.log("  const res = await claude.sendMessage('Hej!');");
    console.log("  // streaming:");
    console.log("  await claude.streamMessage('...', chunk => process.stdout.write(chunk));");
    console.log("  // z plikiem:");
    console.log("  await claude.sendMessage('Przeanalizuj', { files: ['./kod.py'] });\n");
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
    .option('--show-key', 'Show full token (not masked)')
    .option('--reset', 'Reset all config to defaults')
    .action(async (options) => {
        if (options.reset) {
            fs.writeFileSync(getConfigPath(), JSON.stringify({}, null, 2));
            console.log('✅ Config zresetowany.');
            return;
        }

        const cfg = readConfig();
        let changed = false;

        if (options.setModel) {
            const m = resolveModel(options.setModel);
            writeConfig({ defaultModel: m });
            console.log(`✅ Domyślny model: ${m}`);
            changed = true;
        }
        if (options.setMaxTokens) {
            writeConfig({ maxTokens: Number(options.setMaxTokens) });
            console.log(`✅ Max tokens: ${options.setMaxTokens}`);
            changed = true;
        }
        if (changed) return;

        // Show config
        console.log('\n📋 Konfiguracja claude-unapi\n');
        console.log(`  Plik:        ${getConfigPath()}`);

        try {
            const key = getSessionKey();
            if (options.showKey) {
                console.log(`  Token:       ${key}`);
            } else {
                const masked = key.substring(0, 18) + '...' + key.slice(-4);
                const type = key.startsWith('sk-ant-oat01-') ? 'OAuth' : 'Cookie';
                console.log(`  Token:       ${masked} [${type}]`);
            }
        } catch {
            console.log('  Token:       ❌ nie ustawiony');
        }

        const freshCfg = readConfig();
        console.log(`  Model:       ${freshCfg.defaultModel || DEFAULT_MODEL}`);
        console.log(`  Max tokens:  ${freshCfg.maxTokens || 8096}`);
        console.log(`  Node:        ${process.version}`);
        console.log(`  Platform:    ${process.platform} (${os.arch()})`);
        console.log(`  Config dir:  ${path.dirname(getConfigPath())}`);
        console.log();
        console.log('  Opcje: --set-model <opus|sonnet|haiku>  --set-max-tokens <n>  --reset');
        console.log();
    });

// ─── models ───────────────────────────────────────────────────────────────────
program
    .command('models')
    .description('List all available Claude models')
    .action(() => {
        const cfg = readConfig();
        const currentDefault = cfg.defaultModel || DEFAULT_MODEL;

        console.log('\n📋 Dostępne modele Claude:\n');
        const groups = [
            { label: 'Opus  (najmocniejszy)', models: ['claude-opus-4-6', 'claude-opus-4-5-20251101', 'claude-opus-4-1-20250805'] },
            { label: 'Sonnet (balans)', models: ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4'] },
            { label: 'Haiku  (najszybszy)', models: ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022'] },
        ];
        for (const g of groups) {
            console.log(`  ${g.label}`);
            for (const m of g.models) {
                const def = m === currentDefault ? ' ← domyślny' : '';
                console.log(`    ${m}${def}`);
            }
        }
        console.log('\n  Aliasy (krótkie):');
        console.log('    opus    →  claude-opus-4-6');
        console.log('    sonnet  →  claude-sonnet-4-6');
        console.log('    haiku   →  claude-haiku-4-5-20251001');
        console.log('\n  Zmień domyślny:');
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
            console.log(`🔄 Testuję połączenie z Claude (${modelName})...`);
            const claude = new ClaudeClient({ model: modelArg });
            const response = await claude.sendMessage('Reply with one word: working');
            console.log(`✅ Połączenie działa! Odpowiedź: "${response.trim()}"`);
        } catch (err) {
            console.error('❌ Błąd:', err.response?.data?.error?.message || err.message);
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.error('\n💡 Token wygasł lub jest nieprawidłowy.');
                console.error('   Uruchom: claude-unapi setup');
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
                console.log(`📎 Pliki: ${files.map(f => path.basename(f)).join(', ')}`);
            }

            if (options.stream !== false) {
                await claude.streamMessage(message, (chunk) => process.stdout.write(chunk), { files });
                console.log();
            } else {
                const res = await claude.sendMessage(message, { files });
                console.log(res);
            }
        } catch (err) {
            console.error('❌ Błąd:', err.response?.data?.error?.message || err.message);
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
            console.error('❌ Błąd inicjalizacji:', err.response?.data?.error?.message || err.message);
            console.error('   Uruchom: claude-unapi setup');
            process.exit(1);
        }

        box([
            `  🤖 Claude Chat — ${currentModel}  `,
            '---',
            '  /new          Nowa konwersacja (reset kontekstu)',
            '  /model <name> Zmień model w trakcie',
            '  /model?       Pokaż aktualny model',
            '  /file <path>  Wyślij plik z następną wiadomością',
            '  /help         Pokaż komendy',
            '  /exit         Wyjdź',
        ]);
        console.log();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'Ty> ',
        });

        let pendingFiles = [];
        rl.prompt();

        rl.on('line', async (line) => {
            const msg = line.trim();
            if (!msg) { rl.prompt(); return; }

            // ── Komendy wewnętrzne ──
            if (msg === '/exit' || msg === '/quit' || msg === '/q') {
                console.log('\n👋 Do widzenia!');
                process.exit(0);
            }
            if (msg === '/new') {
                claude.newConversation();
                console.log(`\n✅ Nowa konwersacja — model: ${claude.model}\n`);
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
                    console.error(`\n❌ Plik nie istnieje: ${filePath}\n`);
                } else {
                    pendingFiles.push(filePath);
                    console.log(`\n📎 Plik dodany: ${path.basename(filePath)} (zostanie wysłany z następną wiadomością)\n`);
                }
                rl.prompt();
                return;
            }
            if (msg === '/help') {
                console.log('\n  Komendy: /new /model <name> /model? /file <path> /exit\n');
                rl.prompt();
                return;
            }
            if (msg.startsWith('/')) {
                console.log('\n❓ Nieznana komenda. Wpisz /help\n');
                rl.prompt();
                return;
            }

            // ── Wyślij wiadomość ──
            try {
                const files = [...pendingFiles];
                pendingFiles = [];
                if (files.length) console.log(`📎 Wysyłam z plikami: ${files.map(f => path.basename(f)).join(', ')}`);

                process.stdout.write('\nClaude> ');
                if (options.stream !== false) {
                    await claude.streamMessage(msg, (chunk) => process.stdout.write(chunk), { files });
                } else {
                    const response = await claude.sendMessage(msg, { files });
                    process.stdout.write(response);
                }
                console.log('\n');
            } catch (err) {
                console.error('\n❌ Błąd:', err.response?.data?.error?.message || err.message, '\n');
            }

            rl.prompt();
        });

        rl.on('close', () => { console.log('\n👋 Do widzenia!'); process.exit(0); });
    });

// ─── install-path ─────────────────────────────────────────────────────────────
program
    .command('install-path')
    .description('Show how to add claude-unapi to PATH or use in projects')
    .action(() => {
        const pkgDir = path.resolve(__dirname, '..');
        const pkgDirUnix = pkgDir.replace(/\\/g, '/');

        box([
            '  Jak zainstalować / dodać do PATH  ',
            '---',
            '',
            '  ① Globalnie przez npm (zalecane):',
            '',
            `    cd ${pkgDirUnix}`,
            '    npm install -g .',
            '',
            '  Potem wpisuj po prostu: claude-unapi <command>',
            '',
            '---',
            '',
            '  ② Lokalnie w projekcie (package.json):',
            '',
            `    "claude-unapi": "file:${pkgDirUnix}"`,
            '',
            '  Potem: npm install',
            '',
            '---',
            '',
            '  ③ Alias (bez globalu):',
            '',
            isWindows()
                ? `    Set-Alias claude-unapi 'node ${pkgDirUnix}/src/cli.js'`
                : `    alias claude-unapi='node ${pkgDirUnix}/src/cli.js'`,
            '',
        ]);
    });

// ─── commands ─────────────────────────────────────────────────────────────────
program
    .command('commands')
    .description('Show all available commands with examples')
    .action(() => {
        console.log('\n📚 Claude Unofficial API — Wszystkie komendy\n');

        const commands = [
            ['setup', 'Setup wizard — pierwsze uruchomienie', 'claude-unapi setup'],
            ['set-key', 'Zapisz token ręcznie', 'claude-unapi set-key sk-ant-oat01-...'],
            ['config', 'Pokaż / edytuj konfigurację', 'claude-unapi config'],
            ['config', 'Zmień domyślny model', 'claude-unapi config --set-model haiku'],
            ['config', 'Ustaw max tokens', 'claude-unapi config --set-max-tokens 4096'],
            ['config', 'Reset konfiguracji', 'claude-unapi config --reset'],
            ['models', 'Lista modeli Claude', 'claude-unapi models'],
            ['test', 'Przetestuj połączenie', 'claude-unapi test'],
            ['test', 'Test z konkretnym modelem', 'claude-unapi test --model opus'],
            ['ask', 'Jednorazowe pytanie', 'claude-unapi ask "Napisz helloworld w Python"'],
            ['ask', 'Z plikiem', 'claude-unapi ask "Co robi ten kod?" -f main.py'],
            ['ask', 'Z wieloma plikami i modelem', 'claude-unapi ask "Porównaj" -f a.js -f b.js -m opus'],
            ['ask', 'Bez streamingu', 'claude-unapi ask "..." --no-stream'],
            ['chat', 'Interaktywny chat', 'claude-unapi chat'],
            ['chat', 'Chat z wybranym modelem', 'claude-unapi chat --model sonnet'],
            ['install-path', 'Instrukcja instalacji / PATH', 'claude-unapi install-path'],
            ['how-to', 'Jak pobrać token z przeglądarki', 'claude-unapi how-to'],
            ['commands', 'Ta lista', 'claude-unapi commands'],
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

        console.log('  Komendy wewnętrzne w trybie chat:');
        console.log('    /new           Nowa konwersacja');
        console.log('    /model <name>  Zmień model');
        console.log('    /file <path>   Załącz plik');
        console.log('    /exit          Wyjdź z chatu\n');
    });

// ─── how-to ───────────────────────────────────────────────────────────────────
program
    .command('how-to')
    .description('Instructions for getting auth token from browser')
    .action(() => {
        box([
            '  Jak uzyskać token autoryzacyjny  ',
            '---',
            '',
            '  ✅ OPCJA 1 — OAuth (zalecane, ważny 1 rok):',
            '',
            '  1. npm install -g @anthropic-ai/claude-code',
            '  2. claude setup-token',
            '  3. Skopiuj token (sk-ant-oat01-...)',
            '  4. claude-unapi set-key sk-ant-oat01-...',
            '',
            '---',
            '',
            '  🌐 OPCJA 2 — Session cookie z przeglądarki:',
            '',
            '  1. Otwórz https://claude.ai (zaloguj się)',
            '  2. F12 → Application → Cookies → claude.ai',
            '     (Firefox: Storage → Cookies)',
            '  3. Skopiuj: sessionKey (sk-ant-sid01-...)',
            '  4. claude-unapi set-key sk-ant-sid01-...',
            '',
            '  ⚠️  Nie udostępniaj tokena nikomu!',
            '',
        ]);
    });

program.parse();
