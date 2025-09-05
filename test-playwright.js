const { chromium } = require('playwright');
const fs = require('fs');

async function testLogin() {
  // Leggi le credenziali dal file
  const credentials = JSON.parse(fs.readFileSync('./test-credentials.json', 'utf8'));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Ascolta le richieste di rete per debugging
  page.on('request', request => {
    if (request.url().includes('fiscozen') || request.url().includes('login')) {
      console.log('🔍 REQUEST:', request.method(), request.url());
      if (request.postData()) {
        console.log('📤 POST DATA:', request.postData());
      }
    }
  });

  page.on('response', response => {
    if (response.url().includes('fiscozen') || response.url().includes('login')) {
      console.log('📥 RESPONSE:', response.status(), response.url());
    }
  });

  page.on('console', msg => console.log('🖥️  CONSOLE:', msg.text()));

  try {
    // Vai all'app
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Seleziona Simple Workflow
    const simpleButton = page.locator('text=🎯 Simple Workflow');
    if (await simpleButton.isVisible()) {
      await simpleButton.click();
      await page.waitForTimeout(1000);
    }

    // Clicca sul bottone login
    await page.click('button:has-text("🔐 Login e Cerca Cliente")');
    await page.waitForTimeout(1000);

    // Inserisci credenziali
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);

    console.log('✅ Credenziali inserite, tentativo login...');

    // Clicca login
    await page.click('button:has-text("🚀 Connetti a Fiscozen")');
    
    // Aspetta risposta
    await page.waitForTimeout(5000);

    // Verifica se c'è errore o successo
    const errorElement = await page.locator('.bg-red-50').first();
    const successElement = await page.locator('text=✅ Connesso a Fiscozen').first();

    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log('❌ ERRORE LOGIN:', errorText);
      return;
    } else if (await successElement.isVisible()) {
      console.log('✅ LOGIN RIUSCITO! Ora testo la ricerca cliente...');
      
      // Ora testa la ricerca del cliente
      console.log('🔍 Cliccando sul pulsante ricerca cliente...');
      await page.click('button:has-text("🔍 Cerca Cliente su Fiscozen")');
      
      // Aspetta che venga fatta la richiesta di ricerca
      await page.waitForTimeout(3000);
      
      // Verifica se il cliente è stato trovato o se ci sono errori
      const clientFoundElement = await page.locator('text=Cliente trovato').first();
      const noClientElement = await page.locator('text=Nessun cliente trovato').first();
      const clientDataElement = await page.locator('text=scaccino').first();
      
      if (await clientFoundElement.isVisible()) {
        console.log('✅ CLIENTE TROVATO!');
        const clientText = await page.textContent('body');
        console.log('👤 DATI CLIENTE:', clientText.substring(clientText.indexOf('Cliente trovato'), clientText.indexOf('Cliente trovato') + 300));
      } else if (await noClientElement.isVisible()) {
        console.log('⚠️  NESSUN CLIENTE TROVATO per "scaccino"');
      } else if (await clientDataElement.isVisible()) {
        console.log('✅ CLIENTE "SCACCINO" PRESENTE NEI RISULTATI');
      } else {
        console.log('⏳ Ricerca in corso, controllo DOM...');
        const bodyText = await page.textContent('body');
        console.log('📄 RISULTATI RICERCA:', bodyText.substring(0, 800));
      }
      
    } else {
      console.log('⏳ Stato login indeterminato, controllo DOM...');
      const bodyText = await page.textContent('body');
      console.log('📄 CONTENUTO PAGINA:', bodyText.substring(0, 500));
    }

  } catch (error) {
    console.error('💥 ERRORE PLAYWRIGHT:', error);
  } finally {
    await browser.close();
  }
}

testLogin();