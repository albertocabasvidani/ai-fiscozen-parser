import type { ClientData, SearchResult } from '../types/client';

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001/api'
  : '/api';

export const fiscozenAPI = {
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/fiscozen/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async searchClient(companyName: string, partitaIVA?: string): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({ companyName });
      if (partitaIVA) params.append('partitaIVA', partitaIVA);
      
      const response = await fetch(`${API_BASE}/fiscozen/search?${params}`);
      const data = await response.json();
      
      return data.results || [];
    } catch (error) {
      console.error('Error searching client:', error);
      return [];
    }
  },

  async validateVAT(partitaIVA: string): Promise<{ valid: boolean; details?: any }> {
    try {
      const response = await fetch(`${API_BASE}/fiscozen/validate-vat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partitaIVA }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error validating VAT:', error);
      return { valid: false };
    }
  },

  async createClient(clientData: ClientData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/fiscozen/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async getLocationFromCAP(cap: string): Promise<{ comune?: string; provincia?: string }> {
    try {
      const response = await fetch(`${API_BASE}/fiscozen/location/${cap}`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Error getting location:', error);
      return {};
    }
  }
};