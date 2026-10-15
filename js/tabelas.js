/*
 * Tabelas oficiais usadas nos cálculos.
 * Atualize estes valores sempre que a legislação mudar — o restante do site
 * lê tudo daqui.
 */
(function (global) {
  const TABELAS = {
    ano: 2026,

    // INSS do empregado (contribuição progressiva) — vigência 2026
    inss: {
      faixas: [
        { ate: 1621.0, aliquota: 0.075 },
        { ate: 2902.84, aliquota: 0.09 },
        { ate: 4354.27, aliquota: 0.12 },
        { ate: 8475.55, aliquota: 0.14 },
      ],
    },

    // IRRF mensal — tabela progressiva (vigente desde maio/2025)
    irrf: {
      faixas: [
        { ate: 2428.8, aliquota: 0, deducao: 0 },
        { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
        { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
        { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
        { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
      ],
      deducaoPorDependente: 189.59,
      descontoSimplificado: 607.2,
      // Redução do imposto mensal (Lei 15.270/2025), a partir de jan/2026
      reducao: {
        isencaoAte: 5000.0,
        valorMaximo: 312.89,
        faixaParcialAte: 7350.0,
        constante: 978.62,
        fator: 0.133145,
      },
    },

    // Simples Nacional — Anexos da LC 123/2006 (redação da LC 155/2016)
    simples: {
      limitesFaixa: [180000, 360000, 720000, 1800000, 3600000, 4800000],
      anexos: {
        I: {
          nome: 'Anexo I — Comércio',
          faixas: [
            [0.04, 0], [0.073, 5940], [0.095, 13860],
            [0.107, 22500], [0.143, 87300], [0.19, 378000],
          ],
        },
        II: {
          nome: 'Anexo II — Indústria',
          faixas: [
            [0.045, 0], [0.078, 5940], [0.1, 13860],
            [0.112, 22500], [0.147, 85500], [0.3, 720000],
          ],
        },
        III: {
          nome: 'Anexo III — Serviços (ex.: manutenção, agências, academias)',
          faixas: [
            [0.06, 0], [0.112, 9360], [0.135, 17640],
            [0.16, 35640], [0.21, 125640], [0.33, 648000],
          ],
        },
        IV: {
          nome: 'Anexo IV — Serviços (ex.: construção, advocacia, limpeza)',
          faixas: [
            [0.045, 0], [0.09, 8100], [0.102, 12420],
            [0.14, 39780], [0.22, 183780], [0.33, 828000],
          ],
        },
        V: {
          nome: 'Anexo V — Serviços intelectuais (sujeitos ao Fator R)',
          faixas: [
            [0.155, 0], [0.18, 4500], [0.195, 9900],
            [0.205, 17100], [0.23, 62100], [0.305, 540000],
          ],
        },
      },
      fatorRMinimo: 0.28,
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TABELAS;
  } else {
    global.TABELAS = TABELAS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
