const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getSessionKey } = require('./config');

// ─────────────────────────────────────────────────────────────────────────────
// Dostępne modele Claude (aktualne na marzec 2026)
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = {
    // Aliasy
    'opus': 'claude-opus-4-6',
    'sonnet': 'claude-sonnet-4-6',
    'haiku': 'claude-haiku-4-5-20251001',

    // Pełne nazwy (opus)
    'claude-opus-4-6': 'claude-opus-4-6',
    'claude-opus-4-5': 'claude-opus-4-5-20251101',
    'claude-opus-4-5-20251101': 'claude-opus-4-5-20251101',
    'claude-opus-4-1': 'claude-opus-4-1-20250805',

    // Pełne nazwy (sonnet)
    'claude-sonnet-4-6': 'claude-sonnet-4-6',
    'claude-sonnet-4-5': 'claude-sonnet-4-5',
    'claude-sonnet-4': 'claude-sonnet-4',

    // Pełne nazwy (haiku)
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
    'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
    'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
};

const DEFAULT_MODEL = 'claude-sonnet-4-6';

const OAUTH_API_BASE = 'https://api.anthropic.com/v1';
const CLAUDE_AI_BASE = 'https://claude.ai/api';

// Typy MIME obsługiwanych plików
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// Tylko PDF jest akceptowaną przez API jako typ 'document'
const PDF_MIME_TYPE = 'application/pdf';

// Rozszerzenia plików tekstowych/kodu (wklejane inline)
const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'csv', 'html', 'htm', 'xml', 'yaml', 'yml',
    'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'cpp', 'c',
    'h', 'java', 'cs', 'php', 'sh', 'bat', 'ps1', 'sql', 'graphql', 'vue',
    'svelte', 'scss', 'css', 'env', 'gitignore', 'dockerfile', 'toml', 'ini', 'cfg',
]);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zwraca wszystkie dostępne modele (unikalne wartości).
 */
function listModels() {
    const seen = new Set();
    return Object.values(MODELS).filter(v => {
        if (seen.has(v)) return false;
        seen.add(v);
        return true;
    });
}

/**
 * Rozwiąż alias/skrót modelu na pełną nazwę API.
 * @param {string} name
 * @returns {string}
 */
function resolveModel(name) {
    if (!name) return DEFAULT_MODEL;
    const resolved = MODELS[name.toLowerCase()] || MODELS[name];
    if (!resolved) {
        // Jeśli wpisano bezpośrednią nazwę API, użyj jej
        if (name.startsWith('claude-')) return name;
        throw new Error(
            `Nieznany model: "${name}"\n` +
            `Dostępne: ${Object.keys(MODELS).filter(k => !k.startsWith('claude-')).join(', ')}\n` +
            `Lub pełne nazwy API: ${listModels().join(', ')}`
        );
    }
    return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Przygotuj plik do wysłania przez oficjalny Anthropic API.
 *
 * Zwraca obiekt:
 *   { type: 'image', ... }    – dla JPEG/PNG/GIF/WEBP
 *   { type: 'document', ... } – tylko dla PDF
 *   { type: 'text_inline', text } – dla plików tekstowych/kodu (wklejane inline)
 *
 * @param {string} filePath  ścieżka do pliku
 */
function prepareFileBlock(filePath) {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const basename = path.basename(filePath);

    // Obrazy — base64 inline
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        return {
            type: 'image',
            source: { type: 'base64', media_type: mimeMap[ext], data: data.toString('base64') },
        };
    }

    // PDF — dokument base64
    if (ext === 'pdf') {
        return {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: data.toString('base64') },
            title: basename,
        };
    }

    // Reszta (kod, tekst, JSON itd.) — wklejamy jako tekst inline
    return {
        type: 'text_inline',
        text: `<file name="${basename}">\n${data.toString('utf8')}\n</file>`,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

class ClaudeClient {
    /**
     * @param {object} [options]
     * @param {string} [options.sessionKey]     - OAuth token lub session cookie
     * @param {string} [options.model]           - nazwa modelu lub alias (opus/sonnet/haiku)
     * @param {string} [options.conversationId] - istniejąca konwersacja (cookie mode)
     * @param {number} [options.maxTokens]       - maks. tokeny odpowiedzi (domyślnie 8096)
     */
    constructor(options = {}) {
        this.key = options.sessionKey || getSessionKey();
        this.model = resolveModel(options.model);
        this.conversationId = options.conversationId || null;
        this.maxTokens = options.maxTokens || 8096;
        this.organizationId = null;

        this._isOAuth = this.key.startsWith('sk-ant-oat01-');

        if (this._isOAuth) {
            this.http = axios.create({
                baseURL: OAUTH_API_BASE,
                headers: {
                    'Authorization': `Bearer ${this.key}`,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'oauth-2025-04-20',
                },
            });
        } else {
            this.http = axios.create({
                baseURL: CLAUDE_AI_BASE,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
                    'Referer': 'https://claude.ai/',
                    'Origin': 'https://claude.ai',
                    'Cookie': `sessionKey=${this.key}`,
                    'Content-Type': 'application/json',
                    'Anthropic-Client-Platform': 'web_claude_ai',
                },
            });
        }
    }

    // ── Tryb OAuth: oficjalny /v1/messages ──────────────────────────────────────

    /**
     * Zbuduj tablicę content bloków z wiadomości i (opcjonalnych) plików.
     *
     * @param {string} message
     * @param {string[]} [files]  ścieżki do plików
     * @returns {Array}
     */
    _buildContent(message, files = []) {
        const content = [];
        let extraText = '';

        for (const filePath of files) {
            const absPath = path.resolve(filePath);
            if (!fs.existsSync(absPath)) {
                throw new Error(`Plik nie istnieje: ${absPath}`);
            }
            const block = prepareFileBlock(absPath);

            if (block.type === 'text_inline') {
                // Plik tekstowy/kod — dołączamy do tekstu wiadomości
                extraText += '\n\n' + block.text;
            } else {
                // Obraz lub PDF — content block
                content.push(block);
            }
        }

        // Tekst wiadomości (z ewentualnie dołączonymi plikami inline)
        content.push({ type: 'text', text: message + extraText });

        return content;
    }

    async _oauthSend(message, options = {}) {
        const model = resolveModel(options.model) || this.model;
        const files = options.files || [];
        const content = this._buildContent(message, files);

        const messages = options.messages || [{ role: 'user', content }];

        const res = await this.http.post('/messages', {
            model,
            max_tokens: options.maxTokens || this.maxTokens,
            messages,
        });

        const block = res.data.content?.[0];
        return block?.text || '';
    }

    async _oauthStream(message, onChunk, options = {}) {
        const model = resolveModel(options.model) || this.model;
        const files = options.files || [];
        const content = this._buildContent(message, files);

        const messages = options.messages || [{ role: 'user', content }];
        let fullText = '';
        let buffer = '';

        const res = await this.http.post(
            '/messages',
            {
                model,
                max_tokens: options.maxTokens || this.maxTokens,
                messages,
                stream: true,
            },
            { responseType: 'stream' }
        );

        return new Promise((resolve, reject) => {
            res.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                fullText += parsed.delta.text;
                                onChunk(parsed.delta.text);
                            }
                        } catch { /* ignore */ }
                    }
                }
            });
            res.data.on('end', () => resolve(fullText));
            res.data.on('error', reject);
        });
    }

    // ── Tryb cookie: nieoficjalny claude.ai ────────────────────────────────────

    async _getOrganizationId() {
        if (this.organizationId) return this.organizationId;
        const res = await this.http.get('/organizations');
        if (!res.data?.length) throw new Error('Brak organizacji — sprawdź session key');
        this.organizationId = res.data[0].uuid;
        return this.organizationId;
    }

    async _createConversation() {
        const orgId = await this._getOrganizationId();
        const res = await this.http.post(`/organizations/${orgId}/chat_conversations`, {
            uuid: generateUUID(),
            name: '',
        });
        this.conversationId = res.data.uuid;
        return this.conversationId;
    }

    async _cookieSend(message, options = {}) {
        const model = resolveModel(options.model) || this.model;
        const orgId = await this._getOrganizationId();
        if (!this.conversationId) await this._createConversation();

        let fullText = '';
        let buffer = '';

        const res = await this.http.post(
            `/organizations/${orgId}/chat_conversations/${this.conversationId}/completion`,
            {
                prompt: message,
                model,
                timezone: 'Europe/Warsaw',
                attachments: [],
                files: [],
            },
            { responseType: 'stream', headers: { Accept: 'text/event-stream' } }
        );

        return new Promise((resolve, reject) => {
            res.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                fullText += parsed.delta.text;
                            } else if (parsed.completion) {
                                fullText += parsed.completion;
                            }
                        } catch { /* ignore */ }
                    }
                }
            });
            res.data.on('end', () => resolve(fullText));
            res.data.on('error', reject);
        });
    }

    async _cookieStream(message, onChunk, options = {}) {
        const model = resolveModel(options.model) || this.model;
        const orgId = await this._getOrganizationId();
        if (!this.conversationId) await this._createConversation();

        let fullText = '';
        let buffer = '';

        const res = await this.http.post(
            `/organizations/${orgId}/chat_conversations/${this.conversationId}/completion`,
            {
                prompt: message,
                model,
                timezone: 'Europe/Warsaw',
                attachments: [],
                files: [],
            },
            { responseType: 'stream', headers: { Accept: 'text/event-stream' } }
        );

        return new Promise((resolve, reject) => {
            res.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            let text = '';
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                text = parsed.delta.text;
                            } else if (parsed.completion) {
                                text = parsed.completion;
                            }
                            if (text) { fullText += text; onChunk(text); }
                        } catch { /* ignore */ }
                    }
                }
            });
            res.data.on('end', () => resolve(fullText));
            res.data.on('error', reject);
        });
    }

    // ── Publiczne API ──────────────────────────────────────────────────────────

    /**
     * Wyślij wiadomość i poczekaj na pełną odpowiedź.
     *
     * @param {string} message
     * @param {object} [options]
     * @param {string} [options.model]      - model lub alias (opus/sonnet/haiku)
     * @param {string[]} [options.files]    - ścieżki do plików (obrazy, PDF, txt, kod...)
     * @param {number} [options.maxTokens]
     * @returns {Promise<string>}
     *
     * @example
     * await claude.sendMessage('Co jest na zdjęciu?', { files: ['./foto.jpg'] });
     * await claude.sendMessage('Przeanalizuj PDF', { files: ['./raport.pdf'], model: 'opus' });
     */
    async sendMessage(message, options = {}) {
        if (this._isOAuth) return this._oauthSend(message, options);
        return this._cookieSend(message, options);
    }

    /**
     * Streaming — callback wywoływany na każdy fragment tekstu.
     *
     * @param {string} message
     * @param {(chunk: string) => void} onChunk
     * @param {object} [options]
     * @param {string} [options.model]
     * @param {string[]} [options.files]
     * @returns {Promise<string>}
     *
     * @example
     * await claude.streamMessage('Opisz obraz', chunk => process.stdout.write(chunk), {
     *   files: ['./diagram.png']
     * });
     */
    async streamMessage(message, onChunk, options = {}) {
        if (this._isOAuth) return this._oauthStream(message, onChunk, options);
        return this._cookieStream(message, onChunk, options);
    }

    /** Reset kontekstu konwersacji */
    newConversation() {
        this.conversationId = null;
        return this;
    }

    get authMode() {
        return this._isOAuth ? 'oauth' : 'session-cookie';
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

module.exports = ClaudeClient;
module.exports.MODELS = MODELS;
module.exports.listModels = listModels;
module.exports.resolveModel = resolveModel;
module.exports.DEFAULT_MODEL = DEFAULT_MODEL;
