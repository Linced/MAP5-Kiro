import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FormulaBuilder } from '../FormulaBuilder';

describe('FormulaBuilder', () => {
  const mockColumns = ['Open', 'High', 'Low', 'Close', 'Volume'];
  const mockOnFormulaChange = vi.fn();
  const mockOnValidationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders formula input and column buttons', () => {
    render(
      <FormulaBuilder
        columns={mockColumns}
        onFormulaChange={mockOnFormulaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByLabelText('Formula')).toBeInTheDocument();
    expect(screen.getByText('Available Columns')).toBeInTheDocument();
    expect(screen.getByText('Operators')).toBeInTheDocument();
    
    mockColumns.forEach(column => {
      expect(screen.getByText(column)).toBeInTheDocument();
    });
  });

  it('validates formula correctly', () => {
    render(
      <FormulaBuilder
        columns={mockColumns}
        onFormulaChange={mockOnFormulaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    const input = screen.getByLabelText('Formula');
    
    // Test valid formula
    fireEvent.change(input, { target: { value: '[High] + [Low]' } });
    expect(mockOnValidationChange).toHaveBeenCalledWith(true, undefined);
    
    // Test invalid formula with unknown column
    fireEvent.change(input, { target: { value: '[Unknown] + [Low]' } });
    expect(mockOnValidationChange).toHaveBeenCalledWith(false, 'Unknown column: Unknown');
  });

  it('inserts column names when buttons are clicked', () => {
    render(
      <FormulaBuilder
        columns={mockColumns}
        onFormulaChange={mockOnFormulaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    const openButton = screen.getByText('Open');
    fireEvent.click(openButton);
    
    // The formula should be updated with the column reference
    expect(mockOnFormulaChange).toHaveBeenCalledWith('[Open]');
  });

  it('shows validation error for unbalanced parentheses', () => {
    render(
      <FormulaBuilder
        columns={mockColumns}
        onFormulaChange={mockOnFormulaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    const input = screen.getByLabelText('Formula');
    fireEvent.change(input, { target: { value: '([High] + [Low]' } });
    
    expect(mockOnValidationChange).toHaveBeenCalledWith(false, 'Unmatched opening parenthesis');
  });
});