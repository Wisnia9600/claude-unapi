# claude-unapi 🤖

Nieoficjalny wrapper pozwalający używać twojego **Claude Pro** w projektach programistycznych — bez płacenia za oficjalne API.

> ⚠️ Projekt nieoficjalny, niezwiązany z Anthropic. Używaj odpowiedzialnie.

---

## Instalacja

```bash
cd c:\developer\claude-unapi
npm install
```

Opcjonalnie: zainstaluj globalnie dla dostępu do CLI z dowolnego miejsca:
```bash
npm install -g .
```

---

## Krok 1: Pobierz Session Key z przeglądarki

```
node src/cli.js how-to
```

Lub ręcznie:
1. Otwórz **[claude.ai](https://claude.ai)** i zaloguj się
2. Naciśnij **F12** → zakładka **Application** (Chrome/Edge) lub **Storage** (Firefox)
3. Wybierz **Cookies → https://claude.ai**
4. Znajdź cookie o nazwie `sessionKey` (wartość zaczyna się od `sk-ant-sid01-`)
5. Skopiuj wartość

---

## Krok 2: Ustaw klucz

**Opcja A: przez CLI (globalnie, raz na zawsze)**
```bash
node src/cli.js set-key sk-ant-sid01-TWÓJ-TOKEN
```
Token zapisuje się do `~/.claude-unapi/config.json`.

**Opcja B: przez `.env` w projekcie**
```env
CLAUDE_SESSION_KEY=sk-ant-sid01-TWÓJ-TOKEN
```

**Opcja C: zmienna środowiskowa**
```powershell
$env:CLAUDE_SESSION_KEY = "sk-ant-sid01-TWÓJ-TOKEN"
```

---

## Krok 3: Przetestuj

```bash
node src/cli.js test
# ✅ Połączenie działa! Odpowiedź: "działa"
```

---

## Użycie w kodzie

### Podstawowe (czeka na pełną odpowiedź)

```js
const Claude = require('c:/developer/claude-unapi');  // lub ścieżka relatywna

const claude = new Claude();

const odpowiedź = await claude.sendMessage('Napisz funkcję sumującą tablicę liczb w JS');
console.log(odpowiedź);
```

### Streaming (odpowiedź pojawia się na bieżąco)

```js
const Claude = require('c:/developer/claude-unapi');
const claude = new Claude();

await claude.streamMessage(
  'Napisz prostą aplikację Flask w Pythonie',
  (chunk) => process.stdout.write(chunk)  // callback na każdy fragment
);
```

### Konwersacja wieloturowa (kontekst)

```js
const Claude = require('c:/developer/claude-unapi');
const claude = new Claude();

await claude.sendMessage('Mam tablicę: [1, 2, 3, 4, 5]');
const odpowiedź = await claude.sendMessage('Oblicz jej sumę');
// Claude pamięta kontekst z poprzedniej wiadomości
```

### Nowa konwersacja (reset kontekstu)

```js
claude.newConversation();
await claude.sendMessage('Start od nowa');
```

### Ręczne podanie session key (bez konfiguracji)

```js
const Claude = require('c:/developer/claude-unapi');
const claude = new Claude({ sessionKey: 'sk-ant-sid01-...' });
```

---

## CLI

```bash
node src/cli.js set-key <token>   # zapisz session key
node src/cli.js show-key          # pokaż zapisany klucz (zamaskowany)
node src/cli.js test              # przetestuj połączenie
node src/cli.js chat              # interaktywny chat w terminalu
node src/cli.js how-to            # instrukcja pobierania session key
```

---

## Użycie w innym projekcie

Dodaj do `package.json` w projekcie:

```json
{
  "dependencies": {
    "claude-unapi": "file:c:/developer/claude-unapi"
  }
}
```

Następnie:
```bash
npm install
```

Teraz możesz normalnie robić:
```js
const Claude = require('claude-unapi');
```

---

## Uwagi

- Session key wygasa po czasie — jeśli dostaniesz błąd 401, pobierz nowy z przeglądarki
- Biblioteka używa endpointów claude.ai — może przestać działać po aktualizacjach strony
- Nie udostępniaj nikomu swojego session key
