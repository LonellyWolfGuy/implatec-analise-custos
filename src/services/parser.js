import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Papa from 'papaparse';

// Keep the worker on the same version and origin as the PDF.js bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const CAT_PREFIX = {PA:"01",CO:"03",MP:"04",AG:"05",EM:"06",RE:"11"};

export function guessCategory(cod) {
  for (const [cat, prefix] of Object.entries(CAT_PREFIX)) {
    if (cod.startsWith(prefix)) return cat;
  }
  return '??';
}

function parseBrNumber(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
}

function tryParseLine(line) {
  const t = line.trim();
  if (!t) return null;

  let m = t.match(/^\|\s*(?:[0-9A-Z]+\s*)?\|\s*([^|]+)\s*\|\s*([A-Z]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
  if (m) {
    const full = m[1].trim();
    const h = full.indexOf('-');
    return {
      cod: h !== -1 ? full.substring(0, h).trim() : full,
      desc: h !== -1 ? full.substring(h + 1).trim() : full,
      qty: parseBrNumber(m[3]),
      unitCost: parseBrNumber(m[4]),
      totalCost: parseBrNumber(m[5])
    };
  }

  m = t.match(/^\|\s*([\w][\w\-\.]+)\s*\|\s*([^|]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
  if (m) {
    return {
      cod: m[1].trim(),
      desc: m[2].trim(),
      qty: parseBrNumber(m[3]),
      unitCost: parseBrNumber(m[4]),
      totalCost: parseBrNumber(m[5])
    };
  }

  m = t.match(/([\w]+)\s*-\s*([\w\sÀ-ÿ]+?)\s{2,}([A-Z]{2,3})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/);
  if (m) {
    return {
      cod: m[1].trim(),
      desc: m[2].trim(),
      qty: parseBrNumber(m[4]),
      unitCost: parseBrNumber(m[5]),
      totalCost: parseBrNumber(m[6])
    };
  }

  m = t.match(/([\w][\w\-\.]+)\s+([\w\sÀ-ÿ]+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/);
  if (m) {
    return {
      cod: m[1].trim(),
      desc: m[2].trim(),
      qty: parseBrNumber(m[3]),
      unitCost: parseBrNumber(m[4]),
      totalCost: parseBrNumber(m[5])
    };
  }

  m = t.match(/^([\d]{5,}[\w]*)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/);
  if (m) {
    return {
      cod: m[1].trim(),
      desc: m[1].trim(),
      qty: parseBrNumber(m[2]),
      unitCost: parseBrNumber(m[3]),
      totalCost: parseBrNumber(m[4])
    };
  }

  return null;
}

export async function extractFromPdf(file, onProgress) {
  const ab = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
  const allItems = [];
  const seen = new Set();
  
  for (let p = 1; p <= doc.numPages; p++) {
    if (onProgress) onProgress(p, doc.numPages);
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = new Map();
    tc.items.forEach(item => {
      if(item.str.trim() === '') return;
      const y = item.transform[5].toFixed(1);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(item);
    });
    const sortedY = Array.from(rows.keys()).sort((a, b) => parseFloat(b) - parseFloat(a));
    for (const y of sortedY) {
      const items = rows.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const line = items.map(i => i.str).join(' ');
      const parsed = tryParseLine(line);
      if (!parsed) continue;
      if (seen.has(parsed.cod)) continue;
      seen.add(parsed.cod);
      allItems.push({
        cod: parsed.cod,
        desc: parsed.desc,
        cat: '',
        qty: parsed.qty,
        unitCost: parsed.unitCost,
        totalCost: parsed.totalCost
      });
    }
  }
  return allItems;
}

export async function extractFromCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data),
      error: reject
    });
  });
}

export async function processFile(file, onProgress) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    const items = await extractFromPdf(file, onProgress);
    items.forEach(i => { if (!i.cat) i.cat = guessCategory(i.cod); });
    return { name: file.name, items };
  }
  if (fileName.endsWith('.csv')) {
    let items = await extractFromCsv(file);
    // Basic mapping if CSV is raw
    if (items.length > 0 && !items[0].cod && Object.keys(items[0]).length > 0) {
       // Just mapping standard PapaParse to our schema might require specific column checks
       // Assuming it's already mapped if exported from the tool itself, else we might need custom logic.
    }
    items.forEach(i => { if (!i.cat && i.cod) i.cat = guessCategory(i.cod); });
    return { name: file.name, items };
  }
  return null;
}

export function analyzeImportedItems(items) {
  const seen = new Set();
  const duplicateCodes = new Set();
  let missingCode = 0, missingDescription = 0, zeroCost = 0, negativeValues = 0;

  items.forEach(item => {
    const code = String(item.cod || "").trim();
    if (!code) missingCode++;
    else if (seen.has(code)) duplicateCodes.add(code);
    else seen.add(code);
    if (!String(item.desc || "").trim()) missingDescription++;
    if (Number(item.unitCost || 0) === 0) zeroCost++;
    if ([item.qty, item.unitCost, item.totalCost].some(value => Number(value || 0) < 0)) negativeValues++;
  });

  return {
    total: items.length,
    validCodes: seen.size,
    duplicateCodes: duplicateCodes.size,
    missingCode,
    missingDescription,
    zeroCost,
    negativeValues,
    hasWarnings: duplicateCodes.size + missingCode + missingDescription + zeroCost + negativeValues > 0
  };
}
