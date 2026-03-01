# claude-unapi 🤖

> Używaj swojej subskrypcji **Claude Pro** w projektach programistycznych — bez płacenia za oficjalny API.

[![GitHub](https://img.shields.io/badge/GitHub-Wisnia9600%2Fclaude--unapi-blue?logo=github)](https://github.com/Wisnia9600/claude-unapi)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> ⚠️ Projekt nieoficjalny, niezwiązany z Anthropic. Używaj odpowiedzialnie.

---

## Instalacja (1 plik)

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.ps1 | iex
```

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.sh | bash
```

### Ręcznie
```bash
git clone https://github.com/Wisnia9600/claude-unapi.git
cd claude-unapi
npm install
npm install -g .
```

---

## Pierwsze uruchomienie

```bash
claude-unapi setup
```

Kreator przeprowadzi Cię przez:
1. Ustawienie tokena (OAuth z `claude setup-token` lub cookie z przeglądarki)
2. Test połączenia
3. Wybór domyślnego modelu

---

## Komendy

```
claude-unapi setup                    Kreator konfiguracji (zacznij tu)
claude-unapi config                   Pokaż / edytuj konfigurację
claude-unapi config --set-model haiku Zmień domyślny model
claude-unapi models                   Lista dostępnych modeli
claude-unapi test                     Przetestuj połączenie
claude-unapi ask "Napisz funkcję..."  Jednorazowe pytanie
claude-unapi ask "Opisz" -f kod.py    Pytanie z plikiem
claude-unapi chat                     Interaktywny chat
claude-unapi commands                 Pełna lista komend
claude-unapi how-to                   Jak pobrać token
claude-unapi install-path             Jak używać w projektach
```

**Modele (aliasy):** `opus` · `sonnet` (domyślny) · `haiku`

---

## Użycie w kodzie

```js
// Instalacja jako zależność - package.json:
// "claude-unapi": "file:/ścieżka/do/claude-unapi"
// LUB: "claude-unapi": "github:Wisnia9600/claude-unapi"

const Claude = require('claude-unapi');
const claude = new Claude();                    // czyta token automatycznie
const claude = new Claude({ model: 'opus' });  // konkretny model

// Podstawowe wysyłanie
const odpowiedź = await claude.sendMessage('Napisz funkcję w JS...');

// Streaming
await claude.streamMessage('Opisz X', chunk => process.stdout.write(chunk));

// Z plikiem (kod, PDF, obrazy)
await claude.sendMessage('Co robi ten kod?', { files: ['./main.py'] });
await claude.sendMessage('Podsumuj', { files: ['raport.pdf'], model: 'opus' });

// Wiele plików
await claude.sendMessage('Porównaj', { files: ['a.js', 'b.js'] });

// Nowa konwersacja (reset kontekstu)
claude.newConversation();
```

### Użycie przez GitHub

```bash
npm install github:Wisnia9600/claude-unapi
```

```js
const Claude = require('claude-unapi');
```

---

## Token autoryzacyjny

**Opcja 1 — OAuth (zalecane, ważny 1 rok):**
```bash
claude setup-token          # generuje sk-ant-oat01-...
claude-unapi set-key sk-ant-oat01-...
```

**Opcja 2 — Session cookie z przeglądarki:**
```
Claude-unapi how-to         # pełna instrukcja
```

**Przez .env w projekcie:**
```env
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

---

## Obsługiwane pliki

| Typ | Format |
|-----|--------|
| Obrazy | JPEG, PNG, GIF, WEBP (base64) |
| Dokumenty | PDF (base64) |
| Kod/tekst | .py .js .ts .go .rs .cpp .java .json .csv .md (inline) |

---

## Czat w terminalu — komendy

W trybie `claude-unapi chat`:
- `/new` — nowa konwersacja
- `/model opus` — zmiana modelu w locie
- `/file ./kod.py` — wyślij plik z kolejną wiadomością
- `/exit` — wyjście
