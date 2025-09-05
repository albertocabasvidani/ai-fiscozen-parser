const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sessions.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables();
          resolve();
        }
      });
    });
  }

  createTables() {
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        client_data TEXT,
        search_results TEXT,
        status TEXT,
        created_client_id TEXT
      )
    `;

    const createLogsTable = `
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT,
        message TEXT,
        data TEXT
      )
    `;

    this.db.run(createSessionsTable);
    this.db.run(createLogsTable);
  }

  saveSession(sessionData) {
    return new Promise((resolve, reject) => {
      const { id, clientData, searchResults, status, createdClientId } = sessionData;
      
      const query = `
        INSERT OR REPLACE INTO sessions 
        (id, client_data, search_results, status, created_client_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        id,
        JSON.stringify(clientData),
        JSON.stringify(searchResults),
        status,
        createdClientId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  getSession(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM sessions WHERE id = ?';
      
      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          const session = {
            ...row,
            client_data: JSON.parse(row.client_data || '{}'),
            search_results: JSON.parse(row.search_results || '[]')
          };
          resolve(session);
        } else {
          resolve(null);
        }
      });
    });
  }

  getRecentSessions(limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, timestamp, status, created_client_id,
               json_extract(client_data, '$.ragioneSociale') as ragione_sociale
        FROM sessions 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  log(level, message, data = null) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO logs (level, message, data) VALUES (?, ?, ?)';
      
      this.db.run(query, [level, message, JSON.stringify(data)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

const database = new Database();

process.on('SIGINT', async () => {
  await database.close();
  process.exit(0);
});

module.exports = database;