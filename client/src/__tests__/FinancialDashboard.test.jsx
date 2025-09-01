import React from 'react';
import ReactDOM from 'react-dom/client';
import FinancialDashboard from './components/financials/FinancialDashboard';

// Mock the useToast hook since we're testing in isolation
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'mock-token'),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      containers: [
        {
          _id: '1',
          clientFacingId: 'CONT-001',
          realContainerId: 'MSKU1234567',
          status: 'shipped',
          totalRevenue: 50000,
          grossProfit: 15000,
          baseChargesTotal: 35000,
          profitMargin: 30
        }
      ]
    })
  })
);

describe('FinancialDashboard', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    root.render(<FinancialDashboard />);
  });
});