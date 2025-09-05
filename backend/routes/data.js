const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/sqlite');

const router = express.Router();

// Save session data
router.post('/sessions', async (req, res) => {
  try {
    const { clientData, searchResults, status, createdClientId } = req.body;
    const sessionId = uuidv4();

    await database.saveSession({
      id: sessionId,
      clientData,
      searchResults,
      status,
      createdClientId
    });

    await database.log('info', 'Session saved', { sessionId, status });

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error saving session:', error);
    await database.log('error', 'Error saving session', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await database.getSession(id);

    if (session) {
      res.json({ success: true, session });
    } else {
      res.status(404).json({ success: false, error: 'Session not found' });
    }
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent sessions
router.get('/sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sessions = await database.getRecentSessions(limit);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export data as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const sessions = await database.getRecentSessions(1000);
    
    const csvHeaders = 'ID,Timestamp,Ragione Sociale,Status,Created Client ID\n';
    const csvData = sessions.map(session => 
      `"${session.id}","${session.timestamp}","${session.ragione_sociale || ''}","${session.status}","${session.created_client_id || ''}"`
    ).join('\n');

    const csv = csvHeaders + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fiscozen-sessions.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export data as JSON
router.get('/export/json', async (req, res) => {
  try {
    const sessions = await database.getRecentSessions(1000);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="fiscozen-sessions.json"');
    res.json({ sessions, exportedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;