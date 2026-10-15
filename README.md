# Alíquota — Calculadora de Impostos

Site estático (HTML, CSS e JavaScript puro, sem dependências) para cálculos tributários do Brasil:

- **Salário líquido (CLT)**: INSS progressivo e IRRF, com dependentes, pensão, escolha automática do desconto simplificado e a redução da Lei 15.270/2025 (isenção até R$ 5.000 a partir de 2026).
- **Simples Nacional**: alíquota efetiva e valor do DAS pelos Anexos I a V, incluindo o Fator R.
- **Imposto por dentro / por fora**: preço final a partir do valor sem imposto e a alíquota equivalente.
- **Alíquota efetiva**: percentual real a partir do valor bruto e do imposto pago.

## Como usar

Abra `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

Para publicar de graça, ative o **GitHub Pages** no repositório (Settings → Pages → branch principal, pasta raiz).

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `js/tabelas.js` | Todas as tabelas e alíquotas (INSS, IRRF, Simples). **Atualize aqui quando a lei mudar.** |
| `js/calculos.js` | Funções de cálculo puras, sem acesso à página |
| `js/app.js` | Interface: leitura dos formulários e exibição dos resultados |
| `tests/` | Testes dos cálculos |

## Testes

```bash
node --test tests/
```

> Os resultados são estimativas para fins informativos. Confirme os valores com um contador ou com a legislação vigente.
