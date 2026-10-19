import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVLine, parseBooksCSV } from './csv.ts';

test('parseCSVLine handles simple and quoted CSV lines correctly', () => {
  const line1 = 'Fathers of Nations, Paul B. Vitta, Oxford, 650';
  assert.deepEqual(parseCSVLine(line1), ['Fathers of Nations', 'Paul B. Vitta', 'Oxford', '650']);

  const line2 = '"A Silent Song, and Other Stories", "Edited by Godwin Siundu", Spotlight, "450.00"';
  assert.deepEqual(parseCSVLine(line2), ['A Silent Song, and Other Stories', 'Edited by Godwin Siundu', 'Spotlight', '450.00']);
});

test('parseBooksCSV validates row requirements and reports errors', () => {
  const csv = `Title,Author,Publisher,Category,SellingPrice,PurchasePrice,Quantity,ReorderLevel
"The Samaritan",John Lara,KLB,KCSE Setbooks,550,380,25,5
"Missing Title Book",,,General,500,300,10,3
,Anonymous,Pub,General,200,100,5,2
"Invalid Price Book",Author,Pub,General,-50,100,5,2`;

  const result = parseBooksCSV(csv);
  assert.equal(result.totalRows, 4);
  assert.equal(result.validCount, 2);
  assert.equal(result.errorCount, 2);

  // Row 3 has missing title
  assert.equal(result.rows[2].isValid, false);
  assert.match(result.rows[2].errors[0], /Title is required/i);

  // Row 4 has negative price
  assert.equal(result.rows[3].isValid, false);
  assert.match(result.rows[3].errors[0], /positive number/i);
});
