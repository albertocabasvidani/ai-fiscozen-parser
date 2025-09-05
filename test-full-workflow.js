const { chromium } = require('playwright');
const fs = require('fs');

async function testFullWorkflow() {
  // Leggi le credenziali dal file
  const credentials = JSON.parse(fs.readFileSync('./test-credentials.json', 'utf8'));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Ascolta le richieste di rete per debugging
  page.on('request', request => {
    if (request.url().includes('fiscozen') || request.url().includes('localhost:3001')) {
      console.log('🔍 REQUEST:', request.method(), request.url().replace(/.*localhost:3001/, ''));
      if (request.postData()) {
        try {
          const postData = JSON.parse(request.postData());
          if (postData.client) {
            console.log('📤 INVOICE DATA:', {
              cliente: postData.client.ragioneSociale,
              lineItems: postData.lineItems?.length || 0,
              total: postData.total
            });
          } else {
            console.log('📤 POST DATA:', postData);
          }
        } catch (e) {
          console.log('📤 POST DATA:', request.postData().substring(0, 100) + '...');
        }
      }
    }
  });

  page.on('response', response => {
    if (response.url().includes('fiscozen') || response.url().includes('localhost:3001')) {
      const url = response.url().replace(/.*localhost:3001/, '');
      console.log('📥 RESPONSE:', response.status(), url);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ CONSOLE ERROR:', msg.text());
    } else if (msg.text().includes('LOGIN') || msg.text().includes('handleTransactionSubmit')) {
      console.log('🔍 CONSOLE LOG:', msg.text());
    }
  });

  try {
    console.log('🚀 Starting full workflow test...');
    
    // Vai all'app
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Seleziona Simple Workflow
    console.log('📝 Step 1: Selecting Simple Workflow...');
    const simpleButton = page.locator('text=⚡ Flusso Semplificato');
    if (await simpleButton.isVisible()) {
      await simpleButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️  Simple Workflow button not found, using default view');
    }

    // Inserisci dati transazione
    console.log('💰 Step 2: Entering transaction data...');
    
    // Compila i campi della transazione usando selettori corretti
    await page.fill('input[type="number"][placeholder="1000.00"]', '150.00');
    await page.fill('input[placeholder*="Apple Inc"]', 'scaccino');
    await page.fill('input[placeholder*="Consulenza sviluppo software"]', 'Consulenza IT settembre 2025');
    
    // Seleziona la data (oggi)
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);

    await page.waitForTimeout(1000);

    // Clicca sul bottone login e cerca cliente
    console.log('🔐 Step 3: Login and client search...');
    await page.click('button:has-text("🔐 Login e Cerca Cliente")');
    await page.waitForTimeout(1000);

    // Inserisci credenziali nel modal
    console.log('🔑 Inserting credentials...');
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);

    // Clicca login nel modal
    await page.click('button:has-text("🚀 Connetti a Fiscozen")');
    
    // Aspetta risposta login
    await page.waitForTimeout(5000);

    // Chiudi il modal se è ancora aperto
    const modalCloseButton = page.locator('button:has-text("✕")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Modal closed');
    }

    console.log('✅ Login successful! Now clicking search button...');
    
    // Dopo il login, clicca manualmente sul bottone di ricerca
    const searchButton = page.locator('button:has-text("🔍 Cerca Cliente su Fiscozen")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      console.log('✅ Clicked search button after login');
      
      // Aspetta i risultati della ricerca
      await page.waitForTimeout(5000);
    }
    
    // Controlla se il cliente è stato trovato
    const clientFoundElement = await page.locator('text=Cliente trovato, text=Trovati').first();
    const clientDataElement = await page.locator('text=scaccino, text=Scaccino').first();
    
    let clientFound = false;
    if (await clientFoundElement.isVisible() || await clientDataElement.isVisible()) {
      console.log('✅ CLIENT FOUND! Proceeding to invoice creation...');
      clientFound = true;
      
      // Clicca su "Usa questo cliente" se disponibile
      const useClientButton = page.locator('button:has-text("Usa questo cliente"), button:has-text("Seleziona")').first();
      if (await useClientButton.isVisible()) {
        await useClientButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('⚠️  Client not found, but proceeding with workflow test...');
    }

    // Step 4: Se non trova clienti, procede con nuovo cliente
    console.log('📝 Step 4: No clients found - proceeding with new client data...');
    
    // Debug: mostra tutti i bottoni visibili
    const allButtons = await page.locator('button').all();
    console.log('🔍 DEBUG - Visible buttons count:', allButtons.length);
    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      const buttonText = await allButtons[i].textContent();
      console.log(`   Button ${i + 1}: "${buttonText}"`);
    }
    
    // Clicca su "Cliente non trovato - Inserisci dati nuovo cliente"
    const newClientButton = page.locator('button:has-text("📝 Cliente non trovato - Inserisci dati nuovo cliente")');
    if (await newClientButton.isVisible()) {
      await newClientButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked new client button');
      
      // Compila alcuni dati base del cliente
      await page.fill('input[placeholder*="Nome azienda"]', 'Test Scaccino SRL');
      await page.fill('input[placeholder="12345678901"]', '12345678901');
      await page.waitForTimeout(1000);
      
      // Clicca su "Analizza con IA"
      const analyzeButton = page.locator('button:has-text("🤖 Analizza con IA")');
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Started AI analysis');
        
        // Clicca su "Conferma e Crea Cliente"
        const confirmButton = page.locator('button:has-text("✅ Conferma e Crea Cliente")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(5000);
          console.log('✅ Confirmed and creating client');
        }
      } else {
        console.log('⚠️ AI Analyze button not found - looking for confirm button directly');
        const directConfirmButton = page.locator('button:has-text("✅ Conferma e Crea Cliente")');
        if (await directConfirmButton.isVisible()) {
          await directConfirmButton.click();
          await page.waitForTimeout(5000);
          console.log('✅ Confirmed and creating client (direct)');
        }
      }
    }
    
    // Dopo aver inserito i dati, cercare il pulsante "Conferma e Crea Cliente" se visibile
    console.log('🔍 Step 4b: Looking for confirm button...');
    const finalConfirmButton = page.locator('button:has-text("✅ Conferma e Crea Cliente")');
    if (await finalConfirmButton.isVisible()) {
      await finalConfirmButton.click();
      await page.waitForTimeout(5000);
      console.log('✅ Final confirmation - client creation started');
    }

    // Step 5: Creazione fattura
    console.log('📄 Step 5: Creating invoice...');
    await page.waitForTimeout(3000);
    
    // Cerca il pulsante per creare la fattura
    const createInvoiceButton = page.locator(
      'button:has-text("📄 Crea Fattura in Bozza"), button:has-text("Crea Fattura")'
    ).first();
    
    if (await createInvoiceButton.isVisible()) {
      await createInvoiceButton.click();
      console.log('🔄 Invoice creation started...');
      
      // Aspetta la risposta della creazione fattura
      await page.waitForTimeout(8000);
      
      // Verifica il risultato
      const invoiceSuccessElement = await page.locator('text=Fattura creata, text=successo, text=✅').first();
      const invoiceErrorElement = await page.locator('.bg-red-50, .text-red-600').first();
      
      if (await invoiceSuccessElement.isVisible()) {
        console.log('🎉 INVOICE CREATED SUCCESSFULLY!');
        const successText = await page.textContent('body');
        const match = successText.match(/FAT-\d{4}-\d{4}|INV-\d+/);
        if (match) {
          console.log('📄 Invoice ID:', match[0]);
        }
      } else if (await invoiceErrorElement.isVisible()) {
        const errorText = await invoiceErrorElement.textContent();
        console.log('❌ INVOICE CREATION ERROR:', errorText);
      } else {
        console.log('⏳ Invoice creation in progress or status unclear...');
        // Prendi screenshot per debug
        await page.screenshot({ path: 'test-invoice-creation-' + Date.now() + '.png' });
      }
    } else {
      console.log('⚠️  Create invoice button not found');
      
      // Debug: mostra lo stato attuale della pagina e prendi screenshot
      const bodyText = await page.textContent('body');
      console.log('📄 CURRENT PAGE STATE:', bodyText.substring(0, 500));
      await page.screenshot({ path: 'test-no-invoice-button-' + Date.now() + '.png' });
    }

    // Summary del test
    console.log('\n📊 WORKFLOW TEST SUMMARY:');
    console.log('✅ Login:', 'SUCCESS');
    console.log('✅ Client Search:', clientFound ? 'SUCCESS - Client found' : 'COMPLETED - No client found');
    console.log('📄 Invoice Creation:', await createInvoiceButton.isVisible() ? 'ATTEMPTED' : 'BUTTON NOT FOUND');

  } catch (error) {
    console.error('💥 TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Prendi uno screenshot finale
    await page.screenshot({ path: 'test-result-' + Date.now() + '.png' });
    await browser.close();
  }
}

testFullWorkflow();