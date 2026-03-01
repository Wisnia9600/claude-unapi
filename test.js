// ============================================================
// Przykładowy plik testowy - uruchom: node test.js
// ============================================================
// UWAGA: Ustaw najpierw session key:
//   node src/cli.js set-key sk-ant-sid01-...
// ============================================================

const Claude = require('./index.js');

async function main() {
    const claude = new Claude();

    // Test 1: Podstawowa wiadomość
    console.log('Test 1: Wysyłanie podstawowej wiadomości...');
    try {
        const response = await claude.sendMessage('Odpowiedz tylko słowem: działa');
        console.log('✅ Odpowiedź:', response.trim());
    } catch (err) {
        console.error('❌ Błąd:', err.message);
        process.exit(1);
    }

    // Test 2: Streaming
    console.log('\nTest 2: Streaming (policz do 3)...');
    claude.newConversation();
    process.stdout.write('✅ Odpowiedź: ');
    try {
        await claude.streamMessage('Policz do 3 (tylko cyfry przez przecinki)', (chunk) => {
            process.stdout.write(chunk);
        });
        console.log();
    } catch (err) {
        console.error('\n❌ Błąd:', err.message);
    }

    console.log('\n✅ Wszystkie testy zakończone!');
}

main();
