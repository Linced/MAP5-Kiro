import { evaluate, parse, MathNode } from 'mathjs';
import { database } from '../database';
import {
  CalculationEngine,
  ParsedFormula,
  FormulaValidationResult,
  CalculationResult,
  FormulaPreview,
  CalculatedColumn
} from '../types';

export class CalculationService implements CalculationEngine {
  
  parseFormula(formula: string): ParsedFormula {
    try {
      const node = parse(formula);
      const variables = this.extractVariables(node);
      
      return {
        expression: formula,
        variables: Array.from(variables)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Formula parsing failed: ${errorMessage}`);
    }
  }

  validateFormula(formula: string, columns: string[]): FormulaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = this.parseFormula(formula);
      
      // Check if all variables exist in columns
      for (const variable of parsed.variables) {
        if (!columns.includes(variable)) {
          errors.push(`Column '${variable}' not found in dataset`);
        }
      }

      // Test formula with sample data
      const sampleData: Record<string, number> = {};
      for (const col of columns) {
        sampleData[col] = 1; // Use 1 as test value
      }

      try {
        evaluate(formula, sampleData);
      } catch (evalError) {
        const errorMessage = evalError instanceof Error ? evalError.message : 'Unknown evaluation error';
        errors.push(`Formula evaluation error: ${errorMessage}`);
      }

      // Check for potential issues
      if (parsed.variables.length === 0) {
        warnings.push('Formula contains no column references');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        errors: [errorMessage]
      };
    }
  }

  executeFormula(formula: ParsedFormula, data: any[]): CalculationResult {
    const values: (number | null)[] = [];
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const rowData = data[i];
        const result = evaluate(formula.expression, rowData);
        
        if (typeof result === 'number' && !isNaN(result)) {
          values.push(result);
        } else {
          values.push(null);
          errors.push(`Row ${i + 1}: Invalid calculation result`);
        }
      } catch (error) {
        values.push(null);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    return { values, errors };
  }

  generatePreview(formula: string, data: any[], columns: string[]): FormulaPreview {
    const validation = this.validateFormula(formula, columns);
    
    if (!validation.isValid) {
      return {
        columnName: '',
        formula,
        previewValues: [],
        errors: validation.errors
      };
    }

    try {
      const parsed = this.parseFormula(formula);
      const previewData = data.slice(0, 10); // Preview first 10 rows
      const result = this.executeFormula(parsed, previewData);
      
      return {
        columnName: '',
        formula,
        previewValues: result.values,
        errors: result.errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        columnName: '',
        formula,
        previewValues: [],
        errors: [errorMessage]
      };
    }
  }

  async saveCalculatedColumn(
    userId: number, 
    uploadId: string, 
    columnName: string, 
    formula: string
  ): Promise<CalculatedColumn> {
    try {
      const result = await database.run(`
        INSERT INTO calculated_columns (user_id, upload_id, column_name, formula)
        VALUES (?, ?, ?, ?)
      `, [userId, uploadId, columnName, formula]);
      
      const row = await database.get(`
        SELECT * FROM calculated_columns WHERE id = ?
      `, [result.lastID]);
      
      return {
        id: row.id,
        userId: row.user_id,
        uploadId: row.upload_id,
        columnName: row.column_name,
        formula: row.formula,
        createdAt: new Date(row.created_at)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save calculated column: ${errorMessage}`);
    }
  }

  async getCalculatedColumns(userId: number, uploadId: string): Promise<CalculatedColumn[]> {
    try {
      const rows = await database.all(`
        SELECT * FROM calculated_columns 
        WHERE user_id = ? AND upload_id = ?
        ORDER BY created_at DESC
      `, [userId, uploadId]);
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        uploadId: row.upload_id,
        columnName: row.column_name,
        formula: row.formula,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve calculated columns: ${errorMessage}`);
    }
  }

  async deleteCalculatedColumn(userId: number, columnId: number): Promise<void> {
    try {
      const result = await database.run(`
        DELETE FROM calculated_columns 
        WHERE id = ? AND user_id = ?
      `, [columnId, userId]);
      
      if (result.changes === 0) {
        throw new Error('Calculated column not found or access denied');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete calculated column: ${errorMessage}`);
    }
  }

  private extractVariables(node: MathNode): Set<string> {
    const variables = new Set<string>();
    
    node.traverse((node: any) => {
      if (node.type === 'SymbolNode') {
        variables.add(node.name);
      }
    });
    
    return variables;
  }
}