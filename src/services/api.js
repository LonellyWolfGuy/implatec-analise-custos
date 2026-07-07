// Helper function for fetch with retries
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  const RETRY_DELAYS = [2000, 5000, 10000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.status >= 500 && attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || 10000;
        console.warn(`[retry] ${url} retornou ${res.status}. Nova tentativa em ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || 10000;
        console.warn(`[retry] ${url} falhou (${err.message}). Nova tentativa em ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

export async function listInventories(includeCounts = false) {
  const res = await fetchWithRetry(`/api/list_inventories${includeCounts ? '?include_counts=true' : ''}`);
  if (!res.ok) throw new Error('Falha ao carregar catálogos');
  return res.json();
}

export async function getInventory(id) {
  const res = await fetchWithRetry(`/api/get_inventory?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Falha ao carregar inventário');
  return res.json();
}

export async function saveInventoryData(monthYear, filename, data, overwrite = false) {
  const res = await fetchWithRetry("/api/save_inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      month_year: monthYear,
      filename,
      data,
      overwrite
    })
  });
  
  const result = await res.json();
  if (!res.ok) {
    if (res.status === 409) {
      const err = new Error('Mês já catalogado');
      err.status = 409;
      throw err;
    }
    throw new Error(result.error || 'Falha ao salvar');
  }
  return result;
}

export async function deleteInventoryApi(id, all = false) {
  const url = all ? "/api/delete_inventory?all=true" : `/api/delete_inventory?id=${encodeURIComponent(id)}`;
  const res = await fetchWithRetry(url, { method: "DELETE" });
  if (!res.ok) {
    const result = await res.json();
    throw new Error(result.error || 'Falha ao deletar');
  }
  return true;
}
