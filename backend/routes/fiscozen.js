const express = require('express');
const axios = require('axios');
const database = require('../database/sqlite');

const router = express.Router();

// Fiscozen API base configuration
const FISCOZEN_BASE_URL = process.env.FISCOZEN_BASE_URL || 'https://app.fiscozen.it';

// Session storage for authentication tokens and cookies
let authToken = null;
let tokenExpiry = null;
let sessionCookies = null;
let csrfToken = null;

// Helper function to check if token is valid
const isTokenValid = () => {
  return authToken && tokenExpiry && new Date() < tokenExpiry;
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', { email: email?.substring(0, 3) + '***', hasPassword: !!password });

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    // ALWAYS use real Fiscozen API - no mock data

    // Production Fiscozen API integration
    console.log('🌐 Attempting real Fiscozen API login to:', FISCOZEN_BASE_URL);
    console.log('🔍 Using correct endpoint: /api/v1/auth/login/');
    
    // Primo step: ottenere il cookie CSRF
    console.log('🍪 Step 1: Getting CSRF cookie from login page...');
    const cookieJar = axios.create();
    cookieJar.defaults.withCredentials = true;
    
    // Prova diversi path per la pagina di login
    let loginPageResponse = null;
    const possiblePaths = ['/', '/auth/login/', '/login/', '/accounts/login/'];
    
    for (const path of possiblePaths) {
      try {
        console.log(`🔍 Trying login path: ${path}`);
        loginPageResponse = await cookieJar.get(`${FISCOZEN_BASE_URL}${path}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });
        console.log(`✅ Successfully accessed: ${path} (${loginPageResponse.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to access: ${path} (${error.response?.status || 'no response'})`);
        continue;
      }
    }
    
    // Estrarre il CSRF token dal cookie
    const setCookieHeaders = loginPageResponse.headers['set-cookie'] || [];
    csrfToken = null;  // Reset global variable
    sessionCookies = '';  // Reset global variable
    
    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.includes('csrftoken')) {
        const match = cookieHeader.match(/csrftoken=([^;]+)/);
        if (match) {
          csrfToken = match[1];
          console.log('🍪 CSRF Token found:', csrfToken?.substring(0, 10) + '...');
        }
      }
      // Raccogliere tutti i cookie per la sessione
      const cookiePart = cookieHeader.split(';')[0];
      if (sessionCookies) {
        sessionCookies += '; ';
      } else {
        sessionCookies = '';
      }
      sessionCookies += cookiePart;
    }
    
    if (!loginPageResponse) {
      throw new Error('Could not access any login page');
    }
    
    if (!csrfToken) {
      console.log('⚠️  CSRF token not found, trying login without CSRF...');
      // Fallback: prova login senza CSRF token
      try {
        const directLoginResponse = await axios.post(`${FISCOZEN_BASE_URL}/api/v1/auth/login/`, {
          email,
          password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://app.fiscozen.it/',
            'Origin': 'https://app.fiscozen.it',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
          }
        });
        
        if (directLoginResponse.data && directLoginResponse.data.token) {
          authToken = 'fiscozen-' + directLoginResponse.data.token;
          tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          
          await database.log('info', 'Fiscozen direct login successful', { email });
          console.log('✅ Login successful without CSRF!');
          
          return res.json({ success: true, token: authToken });
        }
        
      } catch (directError) {
        console.log('❌ Direct login also failed:', directError.response?.status, directError.response?.data);
        throw new Error('CSRF token not found and direct login failed');
      }
    }
    
    // Secondo step: login con CSRF token
    console.log('🔐 Step 2: Login with CSRF token...');
    console.log('📤 Sending login data:', { email: email?.substring(0, 3) + '***', hasPassword: !!password });
    console.log('🍪 Using CSRF Token:', csrfToken?.substring(0, 10) + '...');
    console.log('🍪 Session Cookies:', sessionCookies?.substring(0, 50) + '...');
    
    const loginResponse = await cookieJar.post(`${FISCOZEN_BASE_URL}/api/v1/auth/login/`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://app.fiscozen.it/',
        'Origin': 'https://app.fiscozen.it',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'X-CSRFToken': csrfToken,
        'Cookie': sessionCookies
      }
    });
    
    console.log('📥 Login response status:', loginResponse.status);
    console.log('📦 Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    // Controlla anche i cookie di risposta per la sessione
    const responseCookies = loginResponse.headers['set-cookie'] || [];
    console.log('🍪 Response cookies:', responseCookies);

    if (loginResponse.status === 200) {
      // Login riuscito! Fiscozen usa autenticazione basata su sessione/cookie
      // Salviamo i cookie di sessione per le chiamate future
      authToken = 'fiscozen-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Salva cookie di sessione e CSRF token per chiamate future  
      // csrfToken è già salvato dal parsing precedente
      const initialCookies = sessionCookies; // Cookie raccolti dal primo GET
      const additionalCookies = responseCookies;
      
      // Combina tutti i cookie per le chiamate successive
      let allCookies = initialCookies || '';
      for (const cookie of additionalCookies) {
        const cookiePart = cookie.split(';')[0];
        if (allCookies) allCookies += '; ';
        allCookies += cookiePart;
      }
      sessionCookies = allCookies;
      
      console.log('💾 Session cookies saved for future API calls');
      console.log('🍪 Complete cookie string:', sessionCookies?.substring(0, 100) + '...');
      
      await database.log('info', 'Fiscozen login successful (session-based)', { email });
      console.log('✅ Login successful! Using session-based authentication');
      
      res.json({ success: true, token: authToken });
    } else {
      await database.log('warn', 'Fiscozen login failed', { email });
      console.log('❌ Login failed with status:', loginResponse.status);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('📊 Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    await database.log('error', 'Login error', { error: error.message });
    
    if (error.response) {
      res.status(error.response.status).json({ 
        success: false, 
        error: error.response.data?.message || 'Authentication failed' 
      });
    } else {
      res.status(500).json({ success: false, error: 'Network error' });
    }
  }
});

// Search clients
router.get('/search', async (req, res) => {
  try {
    if (!isTokenValid()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { companyName, partitaIVA } = req.query;

    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name required' });
    }

    // ALWAYS use real Fiscozen API - no mock data

    // Production Fiscozen API integration
    console.log('🌐 Using real Fiscozen API search');
    console.log('🔑 Auth token type:', authToken?.substring(0, 10) + '...');
    const realToken = authToken.replace('fiscozen-', ''); // Rimuovi prefix
    console.log('🔍 Searching Fiscozen for:', companyName);
    console.log('📡 API URL:', `${FISCOZEN_BASE_URL}/api/v1/customers/`);
    console.log('🍪 Available session cookies:', sessionCookies?.substring(0, 100) + '...');
    console.log('🔑 Available CSRF token:', csrfToken?.substring(0, 15) + '...');
    
    console.log('📡 About to make API call...');
    const searchResponse = await axios.get(`${FISCOZEN_BASE_URL}/api/v1/customers/`, {
      headers: { 
        'Content-Type': 'application/json',
        'Referer': 'https://app.fiscozen.it/',
        'Origin': 'https://app.fiscozen.it',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': sessionCookies
      },
      params: { 
        search: companyName,
        page: 1,
        page_size: 25
      }
    });
    
    console.log('🍪 Used cookies for search:', sessionCookies?.substring(0, 50) + '...');
    console.log('🔑 Used CSRF token:', csrfToken?.substring(0, 10) + '...');

    console.log('📊 Fiscozen API response status:', searchResponse.status);
    console.log('📦 Response data keys:', Object.keys(searchResponse.data || {}));
    
    const results = searchResponse.data.results || searchResponse.data.data || searchResponse.data || [];
    console.log('🎯 Fiscozen search results:', results.length, 'matches');
    console.log('📋 First result sample:', results[0] ? Object.keys(results[0]) : 'no results');
    
    // Trasforma i risultati nel formato atteso dal frontend
    const transformedResults = results.map(customer => ({
      id: customer.id,
      ragioneSociale: customer.company_name || customer.name,
      partitaIVA: customer.vat_number || customer.fiscal_code,
      comune: customer.municipality,
      provincia: customer.province || '',
      indirizzo: customer.address || '',
      email: customer.email || '',
      telefono: customer.phone || ''
    }));
    
    await database.log('info', 'Fiscozen search completed', { 
      companyName, 
      resultsCount: results.length 
    });

    res.json({ success: true, results: transformedResults });

  } catch (error) {
    console.error('Search error:', error.message);
    await database.log('error', 'Search error', { error: error.message });
    
    if (error.response?.status === 401) {
      authToken = null;
      tokenExpiry = null;
    }
    
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Validate VAT number
router.post('/validate-vat', async (req, res) => {
  try {
    const { partitaIVA } = req.body;

    if (!partitaIVA) {
      return res.status(400).json({ success: false, error: 'VAT number required' });
    }

    // Basic Italian VAT format validation
    const vatRegex = /^IT[0-9]{11}$|^[0-9]{11}$/;
    const cleanVat = partitaIVA.replace(/^IT/, '');
    
    if (!vatRegex.test(partitaIVA) && !vatRegex.test(cleanVat)) {
      return res.json({ valid: false, error: 'Invalid VAT format' });
    }

    // ALWAYS use real VAT validation service - no mock data

    // Production VAT validation using EU VIES service or Italian AdE API
    const vatResponse = await axios.get(`https://ec.europa.eu/taxation_customs/vies/services/checkVatService`, {
      params: { countryCode: 'IT', vatNumber: cleanVat }
    });

    const validation = {
      valid: vatResponse.data.valid === true,
      details: vatResponse.data
    };

    await database.log('info', 'VAT validation completed', { partitaIVA, valid: validation.valid });
    
    res.json(validation);

  } catch (error) {
    console.error('VAT validation error:', error.message);
    await database.log('error', 'VAT validation error', { error: error.message });
    
    res.json({ valid: false, error: 'Validation service unavailable' });
  }
});

// Get location data from postal code
router.get('/location/:cap', async (req, res) => {
  try {
    const { cap } = req.params;

    if (!cap || !/^\d{5}$/.test(cap)) {
      return res.status(400).json({ success: false, error: 'Valid CAP required' });
    }

    // ALWAYS use real location API service - no mock data

    // Production location lookup - could use Italian postal service API
    const locationResponse = await axios.get(`https://api.zippopotam.us/IT/${cap}`);
    
    const location = {
      comune: locationResponse.data.places[0]?.['place name'] || '',
      provincia: locationResponse.data.places[0]?.state || ''
    };

    await database.log('info', 'Location lookup completed', { cap, location });
    
    res.json(location);

  } catch (error) {
    console.error('Location lookup error:', error.message);
    await database.log('error', 'Location lookup error', { error: error.message });
    
    res.json({ comune: '', provincia: '', error: 'Location service unavailable' });
  }
});

// Create new invoice
router.post('/invoices', async (req, res) => {
  try {
    console.log('📄 =================================');
    console.log('📄 INVOICE CREATION REQUEST STARTED');
    console.log('📄 =================================');
    
    if (!isTokenValid()) {
      console.log('❌ Authentication failed - no valid token');
      await database.log('error', 'Invoice creation - Authentication failed');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const invoiceData = req.body;
    console.log('📋 Invoice data received:', JSON.stringify(invoiceData, null, 2));

    if (!invoiceData.client?.ragioneSociale || !invoiceData.lineItems?.length) {
      console.log('❌ Invalid invoice data - missing client or line items');
      await database.log('error', 'Invoice creation - Invalid data', { invoiceData });
      return res.status(400).json({ 
        success: false, 
        error: 'Client data and line items required' 
      });
    }

    console.log('🏢 Client:', invoiceData.client.ragioneSociale);
    console.log('📊 Line items count:', invoiceData.lineItems.length);
    console.log('💰 Total amount:', invoiceData.total);
    console.log('🔐 Using session cookies:', sessionCookies ? 'YES' : 'NO');
    console.log('🔑 Auth token available:', authToken ? 'YES' : 'NO');

    // Real Fiscozen API integration - Follow discovered workflow
    console.log('🌐 Creating invoice on Fiscozen API using discovered workflow...');
    
    let customerId = invoiceData.client.id;
    
    // Step 1: If no client ID, search for client first
    if (!customerId && invoiceData.client.ragioneSociale) {
      console.log('🔍 Step 1: Searching for client...');
      try {
        const searchResponse = await axios.get(`${FISCOZEN_BASE_URL}/api/v1/customers/`, {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookies,
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*'
          },
          params: {
            search: invoiceData.client.ragioneSociale,
            page: 1
          }
        });
        
        console.log('📊 Client search results:', searchResponse.data.results?.length || 0);
        if (searchResponse.data.results?.length > 0) {
          customerId = searchResponse.data.results[0].id;
          console.log('✅ Found existing client ID:', customerId);
        }
      } catch (searchError) {
        console.log('⚠️  Client search failed:', searchError.message);
      }
    }
    
    // Step 2: If still no client ID, client needs to be created first
    if (!customerId) {
      console.log('❌ No client ID found - client must be created first');
      return res.status(400).json({
        success: false,
        error: 'Client not found. Please create client first.',
        needsClientCreation: true
      });
    }
    
    // Step 3: Get client details for invoice date
    console.log('📋 Step 2: Getting client details for invoice...');
    const clientDetailsResponse = await axios.get(`${FISCOZEN_BASE_URL}/api/v1/customers/${customerId}/`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*'
      },
      params: {
        invoice_date: invoiceData.date
      }
    });
    
    console.log('✅ Client details retrieved for invoice');
    
    // Step 4: Create invoice data in the format that Fiscozen expects
    console.log('🔥 Step 3: Creating invoice with discovered format...');
    
    // Create invoice data in the format that Fiscozen expects for actual invoice creation
    const directInvoiceData = {
      customer: customerId,
      invoice_date: invoiceData.date,
      payment_due_date: invoiceData.paymentDate || invoiceData.date,
      self_invoice: false, // Required field: false for normal invoices, true for autofattura
      rows: [{
        key: 'row1',
        description: invoiceData.lineItems[0].description,
        quantity: null, // Fiscozen often uses null for quantity
        amount: invoiceData.lineItems[0].unitPrice.toString(),
        total: invoiceData.lineItems[0].unitPrice.toString(),
        invoice_vat: {
          id: 24, // Use the ID observed from Fiscozen API
          law: "OPERAZIONI NON SOGGETTE A IVA AI SENSI DEGLI ARTICOLI DA 7 A 7-SEPTIES DEL DPR 633/1972",
          code: "NS7", // Code for Switzerland export observed in Playwright
          kind: "N2.2",
          value: "0.00",
          invoice_note: "Operazioni non soggette a Iva ai sensi degli articoli da 7 a 7-septies del Dpr 633/1972",
          readable_value: "–"
        },
        welfare_applied: false,
        enasarco_applied: false,
        ex_enpals_applied: false
      }],
      notes: invoiceData.notes ? [invoiceData.notes] : [],
      currency_code: 'EUR',
      fiscal_regime: 'Forfettario',
      payment_method: null,
      service_kind: '',
      enasarco_rate: 0,
      welfare_perc: '0%',
      add_welfare_row: false,
      add_tax_stamp_row: false,
      ex_enpals_applied: false,
      welfare_applicable: false,
      tax_stamp_applicable: false,
      withholding_tax_applicable: false
    };
    
    console.log('📤 Direct invoice data:', JSON.stringify(directInvoiceData, null, 2));
    
    const requestConfig = {
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookies,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://app.fiscozen.it/app/fatture/nuova',
        'Origin': 'https://app.fiscozen.it',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
      }
    };
    
    console.log('📤 Request headers:', JSON.stringify(requestConfig.headers, null, 2));
    
    // Direct invoice creation
    const createUrl = `${FISCOZEN_BASE_URL}/api/v1/invoices/`;
    console.log('🔗 Create URL:', createUrl);
    
    const createResponse = await axios.post(createUrl, directInvoiceData, requestConfig);

    console.log('📥 Fiscozen API Response Status:', createResponse.status);
    console.log('📥 Fiscozen API Response Headers:', JSON.stringify(createResponse.headers, null, 2));
    console.log('📥 Fiscozen API Response Data:', JSON.stringify(createResponse.data, null, 2));

    const invoiceId = createResponse.data.id || createResponse.data.invoiceId;
    const invoiceNumber = createResponse.data.invoiceNumber;
    
    console.log('✅ REAL invoice created successfully!');
    console.log('🆔 Invoice ID:', invoiceId);
    console.log('🔢 Invoice Number:', invoiceNumber);
    
    await database.log('info', 'Fiscozen invoice created (REAL API)', { 
      invoiceId,
      invoiceNumber,
      clientName: invoiceData.client.ragioneSociale,
      total: invoiceData.total,
      responseStatus: createResponse.status
    });

    console.log('📄 ================================');
    console.log('📄 REAL INVOICE CREATION COMPLETE');
    console.log('📄 ================================');

    res.json({ 
      success: true, 
      id: invoiceId,
      invoiceNumber: invoiceNumber,
      message: 'Real invoice created successfully on Fiscozen'
    });

  } catch (error) {
    console.log('❌ ================================');
    console.log('❌ INVOICE CREATION ERROR OCCURRED');
    console.log('❌ ================================');
    console.error('💥 Error message:', error.message);
    console.error('📊 Error status:', error.response?.status);
    console.error('📊 Error data:', JSON.stringify(error.response?.data, null, 2));
    console.error('🔗 Error URL:', error.config?.url);
    console.error('📤 Error request data:', JSON.stringify(error.config?.data, null, 2));
    
    await database.log('error', 'Invoice creation error (DETAILED)', { 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      requestUrl: error.config?.url,
      requestData: error.config?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🔐 Authentication expired, clearing tokens...');
      authToken = null;
      tokenExpiry = null;
      sessionCookies = null;
    }
    
    console.log('❌ ======================');
    console.log('❌ ERROR HANDLING COMPLETE');  
    console.log('❌ ======================');
    
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message,
      details: error.response?.data || {}
    });
  }
});

// Create new client
router.post('/clients', async (req, res) => {
  try {
    if (!isTokenValid()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const clientData = req.body;

    if (!clientData.ragioneSociale) {
      return res.status(400).json({ success: false, error: 'Company name required' });
    }

    // ALWAYS use real Fiscozen API - no mock data
    console.log('🌐 Creating client on Fiscozen API:', `${FISCOZEN_BASE_URL}/api/v1/customers/`);
    
    // Trasforma i dati nel formato Fiscozen
    const fiscozenClientData = {
      country: "Italia",
      customer_type: "Società",
      vat_number: clientData.partitaIVA,
      fiscal_code: clientData.partitaIVA, // Per ora usa P.IVA come CF
      company_name: clientData.ragioneSociale,
      postcode: clientData.cap,
      municipality: clientData.comune,
      address: clientData.indirizzo,
      contact_person: clientData.referente,
      email: clientData.email,
      phone: clientData.telefono,
      destination_code: clientData.codiceDestinatario,
      pec: clientData.pec
    };
    
    console.log('📦 Sending client data:', JSON.stringify(fiscozenClientData, null, 2));
    
    const createResponse = await axios.post(`${FISCOZEN_BASE_URL}/api/v1/customers/`, fiscozenClientData, {
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookies,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://app.fiscozen.it/app/clienti',
        'Origin': 'https://app.fiscozen.it',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const clientId = createResponse.data.id || createResponse.data.clientId;
    
    await database.log('info', 'Fiscozen client created', { 
      clientId, 
      ragioneSociale: clientData.ragioneSociale 
    });

    res.json({ success: true, id: clientId });

  } catch (error) {
    console.error('Client creation error:', error.message);
    await database.log('error', 'Client creation error', { error: error.message });
    
    if (error.response?.status === 401) {
      authToken = null;
      tokenExpiry = null;
    }
    
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

module.exports = router;