import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js via CDN compatível com a versão instalada
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Função para converter strings formatadas "1.234,56" para número 1234.56
function parseBrNumber(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

function guessCategory(cod: string, _desc: string): string {
  if (cod.startsWith('03')) return 'CO';
  if (cod.startsWith('04')) return 'MP';
  if (cod.startsWith('05')) return 'AG';
  if (cod.startsWith('06')) return 'EM';
  if (cod.startsWith('11')) return 'RE';
  return 'PA';
}

export async function extractInventoryFromPdf(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument(arrayBuffer).promise;
  
  const allItems: any[] = [];
  
  for(let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    
    // Agrupa os itens de texto pela coordenada Y (linha a linha)
    const rowsMap = new Map<string, any[]>();
    textContent.items.forEach((item: any) => {
      // Arredondamento para agrupar itens perfeitamente alinhados na mesma linha
      const y = item.transform[5].toFixed(1);
      if (!rowsMap.has(y)) rowsMap.set(y, []);
      rowsMap.get(y)!.push(item);
    });
    
    // Ordena de cima pra baixo (maior Y primeiro)
    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    for (const y of sortedY) {
      const items = rowsMap.get(y)!;
      // Ordena da esquerda para a direita
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      
      const lineStr = items.map(i => i.str).join('');
      
      // Formato: |code - desc|cat|qty|unit|total|
      const match = lineStr.match(/^\|\s*([^|]+)\s*\|\s*([A-Z]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
      
      if (match) {
        const fullDesc = match[1].trim();
        // Separar Código da Descrição ("0101662I004F - PF TAMPA PARA-CHO")
        let cod = fullDesc;
        let desc = fullDesc;
        const hyphenIdx = fullDesc.indexOf('-');
        if (hyphenIdx !== -1) {
          cod = fullDesc.substring(0, hyphenIdx).trim();
          desc = fullDesc.substring(hyphenIdx + 1).trim();
        }

        const quantity = parseBrNumber(match[3]);
        const unitCost = parseBrNumber(match[4]);
        const totalCost = parseBrNumber(match[5]);

        allItems.push({
          cod,
          desc,
          cat: guessCategory(cod, desc), // O Totvs não cospe categoria direto, inferimos
          qty: quantity,
          unitCost: unitCost,
          totalCost: totalCost
        });
      }
    }
  }
  
  return allItems;
}
