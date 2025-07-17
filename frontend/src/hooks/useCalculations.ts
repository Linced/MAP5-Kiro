import { useState, useEffect } from 'react';

interface CalculatedColumn {
  id: number;
  columnName: string;
  formula: string;
  createdAt: string;
}

interface UseCalculationsResult {
  calculatedColumns: CalculatedColumn[];
  loading: boolean;
  error: string | null;
  saveColumn: (columnName: string, formula: string) => Promise<void>;
  updateColumn: (columnId: number, columnName: string, formula: string) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  refreshColumns: () => Promise<void>;
}

export const useCalculations = (uploadId?: string): UseCalculationsResult => {
  const [calculatedColumns, setCalculatedColumns] = useState<CalculatedColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchColumns = async () => {
    if (!uploadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/calculations/columns/${uploadId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch calculated columns');
      }
      
      const data = await response.json();
      setCalculatedColumns(data.columns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching calculated columns:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveColumn = async (columnName: string, formula: string) => {
    if (!uploadId) throw new Error('No upload ID available');
    
    const response = await fetch('/api/calculations/columns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        uploadId,
        columnName,
        formula
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to save column');
    }
    
    await fetchColumns(); // Refresh the list
  };

  const updateColumn = async (columnId: number, columnName: string, formula: string) => {
    const response = await fetch(`/api/calculations/columns/${columnId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        columnName,
        formula
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update column');
    }
    
    await fetchColumns(); // Refresh the list
  };

  const deleteColumn = async (columnId: number) => {
    const response = await fetch(`/api/calculations/columns/${columnId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete column');
    }
    
    await fetchColumns(); // Refresh the list
  };

  const refreshColumns = fetchColumns;

  useEffect(() => {
    fetchColumns();
  }, [uploadId]);

  return {
    calculatedColumns,
    loading,
    error,
    saveColumn,
    updateColumn,
    deleteColumn,
    refreshColumns
  };
};