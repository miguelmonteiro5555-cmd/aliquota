const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calculos.js');

const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('IRPJ presumido de serviços sem adicional', () => {
  const r = C.calcularIRPJ({ receita: 50000, atividade: 'servicos' });
  perto(r.base, 16000);
  perto(r.valor, 2400);
  assert.strictEqual(r.adicional, 0);
});

test('IRPJ presumido com adicional no trimestre', () => {
  const r = C.calcularIRPJ({ receita: 300000, atividade: 'servicos', meses: 3 });
  // base 96.000; 15% = 14.400; adicional 10% × (96.000 − 60.000) = 3.600
  perto(r.valor, 18000);
  perto(r.adicional, 3600);
});

test('IRPJ comércio usa presunção de 8%', () => {
  perto(C.calcularIRPJ({ receita: 100000, atividade: 'comercio' }).base, 8000);
});

test('IRPJ lucro real', () => {
  const r = C.calcularIRPJ({ regime: 'real', lucro: 50000 });
  perto(r.valor, 7500 + 3000);
});

test('INSS do empregado é progressivo e tem teto', () => {
  perto(C.calcularINSSEmpregado(1621).valor, 121.575);
  perto(C.calcularINSSEmpregado(5000).valor, 121.575 + 115.37 + 174.17 + 90.4);
  const acima = C.calcularINSSEmpregado(20000);
  assert.ok(acima.teto);
  perto(acima.valor, C.calcularINSSEmpregado(8475.55).valor);
});

test('INSS da empresa sobre folha e pró-labore', () => {
  const r = C.calcularINSSEmpresa({ folha: 10000, proLabore: 5000, rat: 0.02, fap: 1, terceiros: 0.058 });
  perto(r.patronalFolha, 2000);
  perto(r.ratValor, 200);
  perto(r.terceirosValor, 580);
  perto(r.patronalProLabore, 1000);
  perto(r.retidoSocio, 550);
  perto(r.totalGuia, 4330);
});

test('Retenção do sócio limitada ao teto', () => {
  perto(C.calcularINSSEmpresa({ proLabore: 20000 }).retidoSocio, 8475.55 * 0.11);
});

test('ISS dentro dos limites e retido', () => {
  const r = C.calcularISS({ receita: 10000, aliquota: 0.05, retido: true });
  perto(r.valor, 500);
  assert.strictEqual(r.aRecolher, 0);
  perto(r.liquidoRecebido, 9500);
  const fora = C.calcularISS({ receita: 1000, aliquota: 0.01 });
  perto(fora.valor, 10);
  assert.ok(fora.aviso);
  assert.strictEqual(r.aviso, null);
  assert.ok(C.calcularISS({ receita: 1000, aliquota: 1.5 }).erro);
});

test('Resumo soma os três impostos', () => {
  const r = C.calcularResumo({ receita: 50000, atividade: 'servicos', aliquotaISS: 0.05, folha: 10000, proLabore: 5000, rat: 0.02 });
  perto(r.total, 2400 + 4330 + 2500);
  perto(r.carga, r.total / 50000, 1e-9);
});

test('Alíquotas ajustadas nas tabelas valem nos cálculos', () => {
  const T = require('../js/tabelas.js');
  const original = T.irpj.presuncao.servicos.percentual;
  T.irpj.presuncao.servicos.percentual = 0.4;
  try {
    perto(C.calcularIRPJ({ receita: 10000, atividade: 'servicos' }).base, 4000);
  } finally {
    T.irpj.presuncao.servicos.percentual = original;
  }
});

test('Impostos de uma compra', () => {
  const r = C.calcularPorCompra({ valor: 1000, atividade: 'servicos', aliquotaISS: 0.05 });
  perto(r.irpj, 48); // 1000 × 32% × 15%
  perto(r.iss.valor, 50);
  assert.strictEqual(r.inss, 0);
  perto(r.total, 98);
  perto(r.recebido, 1000);
  perto(r.sobra, 902);
});

test('Compra com ISS e INSS retidos pelo cliente', () => {
  const r = C.calcularPorCompra({ valor: 1000, atividade: 'servicos', aliquotaISS: 0.05, issRetido: true, inssRetido: true });
  perto(r.inss, 110);
  perto(r.retidoPeloCliente, 160);
  perto(r.recebido, 840);
  perto(r.total, 98); // o INSS retido é adiantamento, não custo
  assert.ok(C.calcularPorCompra({ valor: 0, atividade: 'servicos', aliquotaISS: 0.05 }).erro);
});

test('Soma de várias compras', () => {
  const a = C.calcularPorCompra({ valor: 1000, atividade: 'servicos', aliquotaISS: 0.05 });
  const b = C.calcularPorCompra({ valor: 500, atividade: 'comercio', aliquotaISS: 0.02 });
  const s = C.somarCompras([a, b]);
  assert.strictEqual(s.quantidade, 2);
  perto(s.valor, 1500);
  perto(s.total, a.total + b.total);
  perto(s.iss, 60);
});
