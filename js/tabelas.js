/*
 * Tabelas e alíquotas usadas nos cálculos.
 * Atualize estes valores sempre que a legislação mudar — o restante do app
 * lê tudo daqui.
 */
(function (global) {
  const TABELAS = {
    ano: 2026,

    // IRPJ — Lucro Presumido e Lucro Real
    irpj: {
      aliquota: 0.15,
      adicional: 0.1,
      limiteAdicionalMensal: 20000, // R$ 60.000 no trimestre
      // Percentuais de presunção do lucro sobre a receita bruta (Lei 9.249/1995, art. 15)
      presuncao: {
        servicos: { nome: 'Serviços em geral (consultoria, TI, profissões)', curto: 'serviços em geral', percentual: 0.32 },
        comercio: { nome: 'Comércio e indústria', curto: 'comércio e indústria', percentual: 0.08 },
        hospitalar: { nome: 'Serviços hospitalares e de saúde (com requisitos)', curto: 'serviços hospitalares', percentual: 0.08 },
        cargas: { nome: 'Transporte de cargas', curto: 'transporte de cargas', percentual: 0.08 },
        passageiros: { nome: 'Transporte de passageiros', curto: 'transporte de passageiros', percentual: 0.16 },
        combustivel: { nome: 'Revenda de combustíveis', curto: 'revenda de combustíveis', percentual: 0.016 },
      },
    },

    // INSS
    inss: {
      // Contribuição do empregado e do sócio — faixas progressivas de 2026
      faixas: [
        { ate: 1621.0, aliquota: 0.075 },
        { ate: 2902.84, aliquota: 0.09 },
        { ate: 4354.27, aliquota: 0.12 },
        { ate: 8475.55, aliquota: 0.14 },
      ],
      // Contribuição da empresa (CPP)
      patronal: 0.2,
      ratOpcoes: [0.01, 0.02, 0.03], // risco leve, médio, grave
      terceirosPadrao: 0.058, // Sistema S, salário-educação, INCRA (varia pelo FPAS)
      socioProLabore: 0.11, // retido do sócio, limitado ao teto
      retencaoNota: 0.11, // retido pelo cliente na nota de cessão de mão de obra/empreitada
    },

    // ISS — LC 116/2003: cada município define a alíquota entre 2% e 5%
    iss: {
      minima: 0.02,
      maxima: 0.05,
      padrao: 0.05,
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TABELAS;
  } else {
    global.TABELAS = TABELAS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
