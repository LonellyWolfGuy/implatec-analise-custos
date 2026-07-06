#!/usr/bin/env python3
"""Cruza fornecedores com os arquivos trimestrais abertos da PGFN."""
import csv, io, json, os, re, tempfile, unicodedata, urllib.parse, urllib.request, zipfile
from collections import defaultdict
from decimal import Decimal, InvalidOperation

PAGE = "https://www.gov.br/pgfn/pt-br/assuntos/divida-ativa-da-uniao/transparencia-fiscal-1/dados-abertos"

def request(url, method="GET", data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    return urllib.request.urlopen(req, timeout=180)

def normalize(value):
    value = unicodedata.normalize("NFD", value or "")
    return "".join(c for c in value if unicodedata.category(c) != "Mn").upper().strip()

def digits(value): return re.sub(r"\D", "", value or "")

def get_suppliers(base, key):
    url = f"{base}/rest/v1/fornecedores?select=id,cnpj&ativo=eq.true&limit=10000"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    return json.load(request(url, headers=headers))

def latest_urls():
    html = request(PAGE).read().decode("utf-8", "ignore").replace("&amp;", "&")
    found = re.findall(r'href=["\']([^"\']+Dados_abertos_(?:Nao_Previdenciario|FGTS|Previdenciario)\.zip)["\']', html, re.I)
    urls = []
    for href in found:
        url = urllib.parse.urljoin(PAGE, href)
        if url not in urls: urls.append(url)
    if len(urls) < 3: raise RuntimeError("Não foi possível localizar as três bases atuais da PGFN.")
    return urls[:3]

def money(value):
    try: return Decimal((value or "0").replace(".", "").replace(",", "."))
    except InvalidOperation: return Decimal("0")

def scan_zip(url, targets, totals):
    print(f"Baixando {url}", flush=True)
    with tempfile.NamedTemporaryFile(suffix=".zip") as tmp:
        with request(url) as src:
            while chunk := src.read(1024 * 1024 * 8): tmp.write(chunk)
        tmp.flush()
        with zipfile.ZipFile(tmp.name) as archive:
            for name in archive.namelist():
                if not name.lower().endswith(".csv"): continue
                with archive.open(name) as raw, io.TextIOWrapper(raw, encoding="latin-1", errors="replace", newline="") as text:
                    for row in csv.DictReader(text, delimiter=";"):
                        cnpj = digits(row.get("CPF_CNPJ"))
                        if cnpj not in targets: continue
                        value = money(row.get("VALOR_CONSOLIDADO"))
                        status = normalize(row.get("TIPO_SITUACAO_INSCRICAO"))
                        item = totals[cnpj]
                        item["quantidade_inscricoes"] += 1
                        item["valor_total"] += value
                        item["tipos_divida"].add(row.get("RECEITA_PRINCIPAL") or "Não informado")
                        item["situacoes"].add(row.get("TIPO_SITUACAO_INSCRICAO") or "Não informada")
                        if status == "EM COBRANCA": item["valor_irregular"] += value
                        else: item["valor_regularizado"] += value

def upsert(base, key, rows):
    url = f"{base}/rest/v1/pgfn_consultas?on_conflict=fornecedor_id,referencia"
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"}
    for start in range(0, len(rows), 250):
        data = json.dumps(rows[start:start+250]).encode()
        request(url, method="POST", data=data, headers=headers).read()

def main():
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    suppliers = get_suppliers(base, key)
    by_cnpj = {s["cnpj"]: s["id"] for s in suppliers}
    totals = defaultdict(lambda: {"quantidade_inscricoes":0,"valor_total":Decimal(0),"valor_irregular":Decimal(0),"valor_regularizado":Decimal(0),"tipos_divida":set(),"situacoes":set()})
    urls = latest_urls()
    match = re.search(r"/(\d{4})_trimestre_(\d{2})/", urls[0])
    reference = f"{match.group(1)}-T{int(match.group(2))}" if match else "ATUAL"
    for url in urls: scan_zip(url, set(by_cnpj), totals)
    rows = []
    for cnpj, supplier_id in by_cnpj.items():
        item = totals[cnpj]
        rows.append({"fornecedor_id":supplier_id,"referencia":reference,"encontrado":item["quantidade_inscricoes"]>0,"irregular":item["valor_irregular"]>0,"quantidade_inscricoes":item["quantidade_inscricoes"],"valor_total":str(item["valor_total"]),"valor_irregular":str(item["valor_irregular"]),"valor_regularizado":str(item["valor_regularizado"]),"tipos_divida":sorted(item["tipos_divida"]),"situacoes":sorted(item["situacoes"]),"fontes":urls})
    upsert(base, key, rows)
    print(f"Concluído: {len(rows)} fornecedores; {sum(r['encontrado'] for r in rows)} com ocorrências; referência {reference}.")

if __name__ == "__main__": main()
