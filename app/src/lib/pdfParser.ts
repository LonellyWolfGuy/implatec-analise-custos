import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js via CDN compatível com a versão instalada
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Função para converter strings formatadas "1.234,56" para número 1234.56
function parseBrNumber(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Mapeamento rudimentar de Categorias pelo Código (ajustar conforme regras da Implatec)
function guessCategory(cod: string, desc: string): string {
  if (desc.includes('COMPOSTO') || desc.includes('MASTER')) return 'CO';
  if (desc.includes('REFUGO')) return 'RE';
  if (desc.includes('RESINA') || desc.includes('PVC')) return 'MP';
  if (cod.startsWith('01')) return 'PA';
  return 'PA'; // Padrão
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
      
      // Exemplo da linha: |39162000     | 0101662I004F - PF TAMPA PARA-CHO | PC |         10,000 |            23,8240|              238,24|                   |
      // Regex que busca os pilares divididos por "|"
      const match = lineStr.match(/^\|\s*([0-9A-Z]+)\s*\|\s*([^|]+)\s*\|\s*([A-Z]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
      
      if (match) {
        const fullDesc = match[2].trim();
        // Separar Código da Descrição ("0101662I004F - PF TAMPA PARA-CHO")
        let cod = fullDesc;
        let desc = fullDesc;
        const hyphenIdx = fullDesc.indexOf('-');
        if (hyphenIdx !== -1) {
          cod = fullDesc.substring(0, hyphenIdx).trim();
          desc = fullDesc.substring(hyphenIdx + 1).trim();
        }

        const quantity = parseBrNumber(match[4]);
        const unitCost = parseBrNumber(match[5]);
        const totalCost = parseBrNumber(match[6]);

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
