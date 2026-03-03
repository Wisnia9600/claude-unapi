# claude-unapi 🤖

> **Use your Claude Pro subscription as a developer API — directly in your code and scripts.**

[![GitHub](https://img.shields.io/badge/GitHub-Wisnia9600%2Fclaude--unapi-blue?logo=github)](https://github.com/Wisnia9600/claude-unapi)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Built by AI](https://img.shields.io/badge/built%20by-AI%20(Gemini)-blueviolet?logo=google)

Claude Pro subscribers get access to powerful Claude models through the web interface — but accessing those same models programmatically usually means signing up for a separate API plan. **claude-unapi** bridges that gap by letting you authenticate with your existing Pro session and use Claude in any Node.js project, script, or terminal workflow.

> ⚠️ This is an unofficial, community-built tool. It is not affiliated with or endorsed by Anthropic. Use responsibly and in accordance with Anthropic's Terms of Service.

> 🤖 **This entire project was designed and built by AI** (Gemini / Antigravity) as a demonstration of autonomous software development.

---

## Install in one command

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.ps1 | iex
```

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.sh | bash
```

### Manual
```bash
git clone https://github.com/Wisnia9600/claude-unapi.git
cd claude-unapi
npm install && npm install -g .
```

---

## First run

```bash
claude-unapi setup
```

The interactive wizard will guide you through:
1. Setting up your auth token (OAuth via `claude setup-token`, or session cookie from browser)
2. Testing the connection
3. Choosing a default model

---

## Getting an auth token

**Option 1 — OAuth (recommended, valid for 1 year):**

If you have the [Claude Code CLI](https://www.npmjs.com/package/@anthropic-ai/claude-code) installed:
```bash
claude setup-token
claude-unapi set-key sk-ant-oat01-...
```

**Option 2 — Session cookie:**
```
claude-unapi how-to    # full step-by-step instructions
```

**Via environment variable:**
```env
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

---

## Use in code

**Install as a dependency:**
```bash
# From GitHub
npm install github:Wisnia9600/claude-unapi

# Or local path
npm install file:/path/to/claude-unapi
```

```js
const Claude = require('claude-unapi');

// Uses token from config automatically
const claude = new Claude();
const claude = new Claude({ model: 'opus' });   // specific model
const claude = new Claude({ model: 'haiku', maxTokens: 2048 });

// Send a message (await full response)
const reply = await claude.sendMessage('Write a binary search in TypeScript');

// Streaming (chunks arrive in real time)
await claude.streamMessage('Explain async/await', chunk => process.stdout.write(chunk));

// Attach files (code, PDF, images)
await claude.sendMessage('What does this function do?', { files: ['./main.py'] });
await claude.sendMessage('Summarize this PDF', { files: ['report.pdf'], model: 'opus' });
await claude.sendMessage('Describe this image', { files: ['screenshot.png'] });

// Multi-turn conversation (context is preserved automatically)
await claude.sendMessage('I have a list: [1, 2, 3]');
const sum = await claude.sendMessage('What is the sum?');

// Start a fresh conversation
claude.newConversation();
```

---

## CLI reference

```
claude-unapi setup                         Interactive setup wizard ← start here
claude-unapi set-key <token>               Save auth token directly

claude-unapi config                        Show current configuration
claude-unapi config --set-model haiku      Change default model
claude-unapi config --set-max-tokens 4096  Change max response tokens
claude-unapi config --reset                Reset to defaults

claude-unapi models                        List all available models
claude-unapi test                          Test Claude connection
claude-unapi test --model opus

claude-unapi ask "Write hello world"       One-shot question
claude-unapi ask "Explain this" -f main.py -m sonnet
claude-unapi ask "Compare" -f a.js -f b.js --no-stream

claude-unapi chat                          Interactive chat session
claude-unapi chat --model opus

claude-unapi how-to                        How to get auth token
claude-unapi install-path                  Install / project usage info
claude-unapi commands                      Full command list with examples
```

**In-chat commands:**

| Command | Description |
|---------|-------------|
| `/new` | Start new conversation |
| `/model opus` | Switch model mid-session |
| `/model?` | Show current model |
| `/file ./code.py` | Attach file to next message |
| `/exit` | Quit |

---

## Available models

| Alias | Model | Best for |
|-------|-------|----------|
| `opus` | claude-opus-4-6 | Complex reasoning, large codebases |
| `sonnet` | claude-sonnet-4-6 | Everyday tasks *(default)* |
| `haiku` | claude-haiku-4-5-20251001 | Fast, lightweight tasks |

---

## Supported file types

| Category | Formats |
|----------|---------|
| Images | JPEG, PNG, GIF, WEBP |
| Documents | PDF |
| Code & text | .js .ts .py .go .rs .java .cpp .json .csv .md and more |

---

## Configuration priority

Token is resolved in this order:
1. `CLAUDE_CODE_OAUTH_TOKEN` env var
2. `CLAUDE_SESSION_KEY` env var
3. `.env` file in current directory
4. `~/.claude-unapi/config.json` (set by `claude-unapi setup`)

---

## About

This project was **entirely designed and built by AI** — specifically by [Gemini](https://deepmind.google/technologies/gemini/) running as an autonomous coding agent ([Antigravity](https://antigravity.dev/)). From architecture decisions and HTTP client implementation to CLI design, GitHub publishing, and one-click installers — every file in this repository was written by AI in a single session.

The human contributor provided the initial idea and approved decisions along the way.

*Yes, i am very lazy*
