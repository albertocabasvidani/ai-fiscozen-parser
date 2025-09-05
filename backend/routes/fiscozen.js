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

    // For development, still allow real API calls if credentials are provided
    // Only use mock if we're explicitly testing without real credentials
    const useMock = process.env.NODE_ENV === 'development' && (!email.includes('@') || email === 'test@test.com');
    
    if (useMock) {
      console.log('🎭 Using mock login for:', email);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      authToken = 'mock-auth-token-' + Date.now();
      tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await database.log('info', 'Mock login successful', { email });
      
      return res.json({ success: true, token: authToken });
    }

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

    // Use mock only for testing, otherwise use real Fiscozen API
    const useMock = process.env.NODE_ENV === 'development' && !authToken.startsWith('fiscozen-');
    
    if (useMock) {
      console.log('🎭 Using mock search for:', companyName);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock database of companies for more realistic search
      const mockCompanies = [
        { ragioneSociale: 'Mario Scaccino', partitaIVA: '12345678900', id: 'scaccino-1', comune: 'Milano', provincia: 'MI' },
        { ragioneSociale: 'Scaccino & Partners SRL', partitaIVA: '12345678909', id: 'scaccino-2', comune: 'Roma', provincia: 'RM' },
        { ragioneSociale: 'Stripe Inc', partitaIVA: '12345678901', id: 'stripe-1' },
        { ragioneSociale: 'Stripe Italy SRL', partitaIVA: '12345678902', id: 'stripe-2' },
        { ragioneSociale: 'Apple Inc', partitaIVA: '11111111111', id: 'apple-1' },
        { ragioneSociale: 'Google LLC', partitaIVA: '22222222222', id: 'google-1' },
        { ragioneSociale: 'Microsoft Corporation', partitaIVA: '33333333333', id: 'microsoft-1' },
        { ragioneSociale: 'Amazon.com Inc', partitaIVA: '44444444444', id: 'amazon-1' },
        { ragioneSociale: 'Meta Platforms Inc', partitaIVA: '55555555555', id: 'meta-1' },
        { ragioneSociale: 'Tesla Inc', partitaIVA: '66666666666', id: 'tesla-1' },
        { ragioneSociale: 'Netflix Inc', partitaIVA: '77777777777', id: 'netflix-1' },
        { ragioneSociale: 'Spotify Technology SA', partitaIVA: '88888888888', id: 'spotify-1' }
      ];

      // Search logic: find companies that contain the search term (case insensitive)
      const searchTerm = companyName.toLowerCase().trim();
      console.log('🔍 Searching mock database for term:', searchTerm);
      const mockResults = mockCompanies.filter(company => 
        company.ragioneSociale.toLowerCase().includes(searchTerm) ||
        (partitaIVA && company.partitaIVA === partitaIVA)
      );
      console.log('🎯 Mock search results:', mockResults.length, 'matches');

      await database.log('info', 'Mock search completed', { companyName, resultsCount: mockResults.length });
      
      return res.json({ success: true, results: mockResults });
    }

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

    // Mock validation for development
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockValidation = {
        valid: Math.random() > 0.3,
        details: {
          vatNumber: cleanVat,
          country: 'IT',
          companyName: 'Mock Company Name',
          address: 'Mock Address, Italy'
        }
      };

      await database.log('info', 'Mock VAT validation', { partitaIVA, valid: mockValidation.valid });
      
      return res.json(mockValidation);
    }

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

    // Mock location data for development
    if (process.env.NODE_ENV === 'development') {
      const mockLocations = {
        '20121': { comune: 'Milano', provincia: 'MI' },
        '00100': { comune: 'Roma', provincia: 'RM' },
        '10100': { comune: 'Torino', provincia: 'TO' },
        '40100': { comune: 'Bologna', provincia: 'BO' },
        '50100': { comune: 'Firenze', provincia: 'FI' }
      };

      const location = mockLocations[cap] || { comune: 'Comune Sconosciuto', provincia: 'XX' };
      
      await database.log('info', 'Mock location lookup', { cap, location });
      
      return res.json(location);
    }

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
    if (!isTokenValid()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const invoiceData = req.body;

    if (!invoiceData.client?.ragioneSociale || !invoiceData.lineItems?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client data and line items required' 
      });
    }

    // Mock invoice creation for development
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInvoiceId = 'INV-' + Date.now();
      const mockInvoiceNumber = 'FAT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      
      await database.log('info', 'Mock invoice created', { 
        invoiceId: mockInvoiceId,
        invoiceNumber: mockInvoiceNumber,
        clientName: invoiceData.client.ragioneSociale,
        total: invoiceData.total,
        lineItemsCount: invoiceData.lineItems.length
      });
      
      return res.json({ 
        success: true, 
        id: mockInvoiceId,
        invoiceNumber: mockInvoiceNumber,
        message: 'Invoice created successfully'
      });
    }

    // Production Fiscozen API integration
    const createResponse = await axios.post(`${FISCOZEN_BASE_URL}/api/invoices`, invoiceData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const invoiceId = createResponse.data.id || createResponse.data.invoiceId;
    const invoiceNumber = createResponse.data.invoiceNumber;
    
    await database.log('info', 'Fiscozen invoice created', { 
      invoiceId,
      invoiceNumber,
      clientName: invoiceData.client.ragioneSociale,
      total: invoiceData.total
    });

    res.json({ 
      success: true, 
      id: invoiceId,
      invoiceNumber: invoiceNumber
    });

  } catch (error) {
    console.error('Invoice creation error:', error.message);
    await database.log('error', 'Invoice creation error', { error: error.message });
    
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

    // Mock client creation for development
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockClientId = 'mock-client-' + Date.now();
      
      await database.log('info', 'Mock client created', { 
        clientId: mockClientId, 
        ragioneSociale: clientData.ragioneSociale 
      });
      
      return res.json({ success: true, id: mockClientId });
    }

    // Production Fiscozen API integration
    const realToken = authToken.replace('fiscozen-', ''); 
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
        Authorization: `Bearer ${realToken}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
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