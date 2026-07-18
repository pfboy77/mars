import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

test('renders the canonical zero-resource initial state', () => {
  render(<App />);
  expect(screen.getByText('MC: 0')).toBeInTheDocument();
  expect(screen.getByText('Steel: 0')).toBeInTheDocument();
  expect(screen.getByText('TR:')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
});

test('TR changes participate in undo and redo', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Increase TR' }));
  expect(screen.getByText('21')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
  expect(screen.getByText('20')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Redo/ }));
  expect(screen.getByText('21')).toBeInTheDocument();
});
