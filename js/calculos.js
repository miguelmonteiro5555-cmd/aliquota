/*
 * Funções de cálculo puras (sem acesso à página), testáveis com Node.
 */
(function (global) {
  const T =
    typeof module !== 'undefined' && module.exports
      ? require('./tabelas.js')
      : global.TABELAS;

  const arred = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

  /**
   * IRPJ: 15% sobre o lucro + 10% de adicional sobre o que passar de
   * R$ 20.000 por mês do período. No Lucro Presumido o lucro é um
   * percentual da receita; no Lucro Real é o lucro apurado.
   */
  function calcularIRPJ({ regime = 'presumido', receita = 0, atividade = 'servicos', lucro = 0, meses = 1 }) {
    const I = T.irpj;
    let base;
    let presuncao = null;
    if (regime === 'presumido') {
      presuncao = I.presuncao[atividade].percentual;
      base = receita * presuncao;
    } else {
      base = lucro;
    }
    base = Math.max(0, arred(base));
    const limiteAdicional = I.limiteAdicionalMensal * meses;
    const normal = arred(base * I.aliquota);
    const adicional = arred(Math.max(0, base - limiteAdicional) * I.adicional);
    const valor = arred(normal + adicional);
    return {
      regime,
      presuncao,
      base,
      normal,
      limiteAdicional,
      adicional,
      valor,
      aliquotaSobreReceita: receita > 0 ? valor / receita : null,
    };
  }

  /** INSS progressivo de um trabalhador: cada faixa incide só sobre a parte do salário nela. */
  function calcularINSSEmpregado(salario) {
    let anterior = 0;
    let total = 0;
    const detalhes = [];
    for (const f of T.inss.faixas) {
      if (salario <= anterior) break;
      const base = Math.min(salario, f.ate) - anterior;
      const valor = base * f.aliquota;
      detalhes.push({ base: arred(base), aliquota: f.aliquota, valor: arred(valor) });
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

  /**
   * INSS a cargo da empresa (Lucro Presumido/Real):
   * - folha de empregados: 20% patronal + RAT × FAP + terceiros
   * - pró-labore: 20% patronal da empresa + 11% retido do sócio (até o teto)
   */
  function calcularINSSEmpresa({ folha = 0, proLabore = 0, rat = 0.02, fap = 1, terceiros = T.inss.terceirosPadrao }) {
    const I = T.inss;
    const teto = I.faixas[I.faixas.length - 1].ate;
    const patronalFolha = arred(folha * I.patronal);
    const ratAjustado = rat * fap;
    const ratValor = arred(folha * ratAjustado);
    const terceirosValor = arred(folha * terceiros);
    const patronalProLabore = arred(proLabore * I.patronal);
    const retidoSocio = arred(Math.min(proLabore, teto) * I.socioProLabore);
    const custoEmpresa = arred(patronalFolha + ratValor + terceirosValor + patronalProLabore);
    return {
      patronalFolha,
      ratAjustado,
      ratValor,
      terceirosValor,
      patronalProLabore,
      custoEmpresa,
      retidoSocio,
      totalGuia: arred(custoEmpresa + retidoSocio),
      aliquotaSobreFolha: folha + proLabore > 0 ? custoEmpresa / (folha + proLabore) : 0,
    };
  }

  /** ISS sobre a receita de serviços. Se o tomador retiver, a empresa não recolhe esse valor na guia. */
  function calcularISS({ receita, aliquota, retido = false }) {
    const I = T.iss;
    if (aliquota < I.minima - 1e-9 || aliquota > I.maxima + 1e-9) {
      return { erro: 'A alíquota do ISS deve ficar entre 2% e 5% (LC 116/2003).' };
    }
    const valor = arred(receita * aliquota);
    return {
      valor,
      retido,
      aRecolher: retido ? 0 : valor,
      liquidoRecebido: arred(receita - (retido ? valor : 0)),
    };
  }

  /** Soma os três impostos de um mês e mostra a carga sobre a receita. */
  function calcularResumo({ receita, atividade, aliquotaISS, folha, proLabore, rat }) {
    const irpj = calcularIRPJ({ regime: 'presumido', receita, atividade, meses: 1 });
    const inss = calcularINSSEmpresa({ folha, proLabore, rat });
    const iss = calcularISS({ receita, aliquota: aliquotaISS });
    if (iss.erro) return iss;
    const itens = [
      { nome: 'IRPJ', valor: irpj.valor },
      { nome: 'INSS', valor: inss.totalGuia },
      { nome: 'ISS', valor: iss.valor },
    ];
    const total = arred(itens.reduce((s, i) => s + i.valor, 0));
    itens.forEach((i) => {
      i.sobreReceita = receita > 0 ? i.valor / receita : 0;
      i.participacao = total > 0 ? i.valor / total : 0;
    });
    return { irpj, inss, iss, itens, total, carga: receita > 0 ? total / receita : 0 };
  }

  const API = {
    calcularIRPJ,
    calcularINSSEmpregado,
    calcularINSSEmpresa,
    calcularISS,
    calcularResumo,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else {
    global.Calculos = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
