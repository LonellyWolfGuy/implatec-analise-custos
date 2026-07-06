from reportlab.pdfgen.canvas import Canvas

out = r"C:\Users\thiag\OneDrive\Documentos\Projetos Claude Code\fornecedor-compliance\.cnd-teste.pdf"
c = Canvas(out)
c.drawString(72, 760, "CERTIDAO NEGATIVA DE DEBITOS")
c.drawString(72, 730, "CNPJ 00.716.481/0001-36")
c.drawString(72, 700, "Valida ate 31/12/2026")
c.drawString(72, 670, "Codigo de Controle: ABCD.1234.EFGH.5678")
c.save()
print(out)

