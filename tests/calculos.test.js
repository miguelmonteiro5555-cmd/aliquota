const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calculos.js');

const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('INSS progressivo', () => {
  perto(C.calcularINSS(1621).valor, 121.575);
  // 1621×7,5% + 1281,84×9% + 1451,43×12% + 645,73×14%
  perto(C.calcularINSS(5000).valor, 121.575 + 115.37 + 174.17 + 90.4);
  const teto = C.calcularINSS(20000);
  assert.ok(teto.teto);
  perto(teto.valor, C.calcularINSS(8475.55).valor);
});

test('IRRF: isento até R$ 5.000 com a redução', () => {
  const inss = C.calcularINSS(5000).valor;
  const ir = C.calcularIRRF({ bruto: 5000, inss });
  assert.ok(ir.impostoTabela > 0);
  assert.strictEqual(ir.valor, 0);
});

test('IRRF: sem redução acima de R$ 7.350', () => {
  const inss = C.calcularINSS(10000).valor;
  const ir = C.calcularIRRF({ bruto: 10000, inss });
  assert.strictEqual(ir.reducao, 0);
  perto(ir.valor, (10000 - inss) * 0.275 - 908.73);
});

test('IRRF: usa desconto simplificado quando mais vantajoso', () => {
  const ir = C.calcularIRRF({ bruto: 3000, inss: 100, aplicarReducao: false });
  assert.ok(ir.usaSimplificado);
  perto(ir.base, 3000 - 607.2);
});

test('Simples Nacional Anexo I, 2ª faixa', () => {
  const r = C.calcularSimples({ rbt12: 300000, faturamentoMes: 25000, anexo: 'I' });
  perto(r.aliquotaEfetiva, (300000 * 0.073 - 5940) / 300000, 1e-9);
  perto(r.das, 25000 * r.aliquotaEfetiva);
});

test('Fator R move Anexo V para Anexo III', () => {
  const r = C.calcularSimples({ rbt12: 200000, faturamentoMes: 20000, anexo: 'V', folha12: 60000 });
  assert.strictEqual(r.anexo, 'III');
  const r2 = C.calcularSimples({ rbt12: 200000, faturamentoMes: 20000, anexo: 'V', folha12: 10000 });
  assert.strictEqual(r2.anexo, 'V');
});

test('Simples acima do limite retorna erro', () => {
  assert.ok(C.calcularSimples({ rbt12: 5e6, faturamentoMes: 1, anexo: 'I' }).erro);
});

test('Por dentro e por fora', () => {
  const fora = C.calcularPorDentroPorFora({ valor: 100, aliquota: 0.18, modo: 'fora' });
  perto(fora.comImposto, 118);
  const dentro = C.calcularPorDentroPorFora({ valor: 100, aliquota: 0.18, modo: 'dentro' });
  perto(dentro.comImposto, 121.95);
  perto(dentro.imposto / dentro.comImposto, 0.18, 0.001);
});

test('Alíquota efetiva', () => {
  perto(C.calcularAliquotaEfetiva({ base: 1000, imposto: 150 }).aliquota, 0.15, 1e-9);
});
