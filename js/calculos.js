/*
 * Funções de cálculo puras (sem acesso ao DOM), testáveis com Node.
 */
(function (global) {
  const T =
    typeof module !== 'undefined' && module.exports
      ? require('./tabelas.js')
      : global.TABELAS;

  const arred = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

  /** INSS progressivo do empregado: cada faixa incide só sobre a parcela do salário nela. */
  function calcularINSS(salario) {
    let anterior = 0;
    let total = 0;
    const detalhes = [];
    for (const f of T.inss.faixas) {
      if (salario <= anterior) break;
      const base = Math.min(salario, f.ate) - anterior;
      const valor = base * f.aliquota;
      detalhes.push({ de: anterior, ate: f.ate, base: arred(base), aliquota: f.aliquota, valor: arred(valor) });
      total += valor;
      anterior = f.ate;
    }
    total = arred(total);
    return {
      valor: total,
      teto: salario > T.inss.faixas[T.inss.faixas.length - 1].ate,
      aliquotaEfetiva: salario > 0 ? total / salario : 0,
      detalhes,
    };
  }

  function impostoPelaTabela(base) {
    const faixa = T.irrf.faixas.find((f) => base <= f.ate);
    return { faixa, valor: Math.max(0, arred(base * faixa.aliquota - faixa.deducao)) };
  }

  /** Redução mensal do IR prevista na Lei 15.270/2025, calculada sobre os rendimentos tributáveis. */
  function reducaoIR(rendimentos, imposto) {
    const r = T.irrf.reducao;
    let reducao = 0;
    if (rendimentos <= r.isencaoAte) reducao = r.valorMaximo;
    else if (rendimentos <= r.faixaParcialAte) reducao = r.constante - r.fator * rendimentos;
    return arred(Math.min(Math.max(reducao, 0), imposto));
  }

  /**
   * IRRF mensal sobre salário. Escolhe automaticamente entre deduções legais
   * e desconto simplificado, o que for mais vantajoso.
   */
  function calcularIRRF({ bruto, inss, dependentes = 0, pensao = 0, aplicarReducao = true }) {
    const deducoesLegais = inss + dependentes * T.irrf.deducaoPorDependente + pensao;
    const usaSimplificado = T.irrf.descontoSimplificado > deducoesLegais;
    const deducao = usaSimplificado ? T.irrf.descontoSimplificado : deducoesLegais;
    const base = Math.max(0, arred(bruto - deducao));
    const { faixa, valor: impostoTabela } = impostoPelaTabela(base);
    const reducao = aplicarReducao ? reducaoIR(bruto, impostoTabela) : 0;
    const valor = arred(impostoTabela - reducao);
    return {
      base,
      deducao: arred(deducao),
      usaSimplificado,
      aliquotaNominal: faixa.aliquota,
      impostoTabela,
      reducao,
      valor,
      aliquotaEfetiva: bruto > 0 ? valor / bruto : 0,
    };
  }

  function calcularSalarioLiquido({ bruto, dependentes = 0, pensao = 0, outros = 0 }) {
    const inss = calcularINSS(bruto);
    const irrf = calcularIRRF({ bruto, inss: inss.valor, dependentes, pensao });
    const descontos = arred(inss.valor + irrf.valor + pensao + outros);
    return {
      bruto,
      inss,
      irrf,
      pensao,
      outros,
      descontos,
      liquido: arred(bruto - descontos),
      cargaTributaria: bruto > 0 ? (inss.valor + irrf.valor) / bruto : 0,
    };
  }

  /** Simples Nacional: alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) / RBT12. */
  function calcularSimples({ rbt12, faturamentoMes, anexo, folha12 = null }) {
    const S = T.simples;
    let anexoUsado = anexo;
    let fatorR = null;
    if (anexo === 'V' && folha12 !== null && rbt12 > 0) {
      fatorR = folha12 / rbt12;
      if (fatorR >= S.fatorRMinimo) anexoUsado = 'III';
    }
    if (rbt12 > S.limitesFaixa[S.limitesFaixa.length - 1]) {
      return { erro: 'Receita acima do limite do Simples Nacional (R$ 4,8 milhões).' };
    }
    const indice = S.limitesFaixa.findIndex((lim) => rbt12 <= lim);
    const [nominal, parcela] = S.anexos[anexoUsado].faixas[indice];
    const efetiva = rbt12 > 0 ? (rbt12 * nominal - parcela) / rbt12 : nominal;
    return {
      anexo: anexoUsado,
      nomeAnexo: S.anexos[anexoUsado].nome,
      fatorR,
      faixa: indice + 1,
      aliquotaNominal: nominal,
      parcelaDeduzir: parcela,
      aliquotaEfetiva: efetiva,
      das: arred(faturamentoMes * efetiva),
    };
  }

  /** Converte entre valor sem e com imposto, para imposto "por fora" ou "por dentro". */
  function calcularPorDentroPorFora({ valor, aliquota, modo }) {
    if (modo === 'fora') {
      const imposto = arred(valor * aliquota);
      return { semImposto: valor, imposto, comImposto: arred(valor + imposto), aliquotaSobreTotal: aliquota / (1 + aliquota) };
    }
    // por dentro: o imposto faz parte da própria base (preço final)
    if (aliquota >= 1) return { erro: 'A alíquota por dentro deve ser menor que 100%.' };
    const comImposto = arred(valor / (1 - aliquota));
    const imposto = arred(comImposto - valor);
    return { semImposto: valor, imposto, comImposto, aliquotaSobreBase: aliquota / (1 - aliquota) };
  }

  /** Descobre a alíquota efetiva a partir do imposto pago. */
  function calcularAliquotaEfetiva({ base, imposto }) {
    if (base <= 0) return { erro: 'Informe uma base maior que zero.' };
    return { aliquota: imposto / base, liquido: arred(base - imposto) };
  }

  const API = {
    calcularINSS,
    calcularIRRF,
    calcularSalarioLiquido,
    calcularSimples,
    calcularPorDentroPorFora,
    calcularAliquotaEfetiva,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else {
    global.Calculos = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
