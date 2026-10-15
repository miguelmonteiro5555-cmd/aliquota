# Alíquota — IRPJ, INSS e ISS

App web estático (HTML, CSS e JavaScript puro, sem dependências) para calcular os três principais impostos de uma empresa de serviços:

- **Resumo**: IRPJ + INSS + ISS do mês, com o peso de cada um e a carga total sobre a receita.
- **IRPJ**: Lucro Presumido (presunção por atividade) ou Lucro Real, por mês ou trimestre, com o adicional de 10% acima de R$ 20.000/mês.
- **INSS**: contribuição da empresa (20% patronal, RAT × FAP, terceiros, pró-labore e 11% retido do sócio) e desconto progressivo do empregado.
- **ISS**: imposto municipal de 2% a 5%, com opção de retenção pelo tomador.

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
| `js/tabelas.js` | Todas as alíquotas e tabelas (IRPJ, INSS, ISS). **Atualize aqui quando a lei mudar.** |
| `js/calculos.js` | Funções de cálculo puras, sem acesso à página |
| `js/app.js` | Interface: leitura dos formulários e exibição dos resultados |
| `tests/` | Testes dos cálculos |

## Testes

```bash
node --test tests/*.test.js
```

> Os resultados são estimativas para fins informativos. Confirme os valores com um contador ou com a legislação do seu município.
