(function () {
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = (v, casas = 2) =>
    (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';

  /** Aceita "1.234,56", "1234.56" ou "1234,56". */
  function numero(texto) {
    if (!texto) return 0;
    let s = String(texto).replace(/[^\d.,-]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  const linha = (rotulo, valor, classe = '') => `<tr class="${classe}"><td>${rotulo}</td><td>${valor}</td></tr>`;

  function mostrar(id, html) {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const erro = (id, msg) => mostrar(id, `<p class="erro">${msg}</p>`);

  // Abas
  document.querySelectorAll('.aba').forEach((botao) => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach((b) => {
        const ativa = b === botao;
        b.classList.toggle('ativa', ativa);
        b.setAttribute('aria-selected', ativa);
      });
      document.querySelectorAll('.painel').forEach((p) => {
        p.hidden = p.id !== 'painel-' + botao.dataset.aba;
      });
    });
  });

  document.getElementById('ano-tabelas').textContent = TABELAS.ano;

  // Salário líquido
  document.getElementById('form-salario').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const bruto = numero(f.bruto.value);
    if (bruto <= 0) return erro('res-salario', 'Informe um salário bruto maior que zero.');
    const r = Calculos.calcularSalarioLiquido({
      bruto,
      dependentes: parseInt(f.dependentes.value, 10) || 0,
      pensao: numero(f.pensao.value),
      outros: numero(f.outros.value),
    });
    const ir = r.irrf;
    mostrar('res-salario', `
      <div class="destaque">
        <span>Salário líquido</span>
        <strong>${brl.format(r.liquido)}</strong>
        <small>Carga de INSS + IR: ${pct(r.cargaTributaria)}</small>
      </div>
      <table>
        ${linha('Salário bruto', brl.format(r.bruto))}
        ${linha(`INSS ${r.inss.teto ? '(no teto)' : ''} — efetiva ${pct(r.inss.aliquotaEfetiva)}`, '− ' + brl.format(r.inss.valor))}
        ${linha(`IRRF — efetiva ${pct(ir.aliquotaEfetiva)}`, '− ' + brl.format(ir.valor))}
        ${r.pensao ? linha('Pensão alimentícia', '− ' + brl.format(r.pensao)) : ''}
        ${r.outros ? linha('Outros descontos', '− ' + brl.format(r.outros)) : ''}
        ${linha('Total de descontos', '− ' + brl.format(r.descontos), 'total')}
      </table>
      <details>
        <summary>Como o IR foi calculado</summary>
        <table>
          ${linha(ir.usaSimplificado ? 'Desconto simplificado (mais vantajoso)' : 'Deduções legais (INSS, dependentes, pensão)', '− ' + brl.format(ir.deducao))}
          ${linha('Base de cálculo', brl.format(ir.base))}
          ${linha('Alíquota nominal da faixa', pct(ir.aliquotaNominal, 1))}
          ${linha('Imposto pela tabela', brl.format(ir.impostoTabela))}
          ${linha('Redução (Lei 15.270/2025)', '− ' + brl.format(ir.reducao))}
          ${linha('IR a pagar', brl.format(ir.valor), 'total')}
        </table>
        <p class="ajuda">INSS por faixa: ${r.inss.detalhes
          .map((d) => `${pct(d.aliquota, 1)} sobre ${brl.format(d.base)} = ${brl.format(d.valor)}`)
          .join('; ')}.</p>
      </details>
    `);
  });

  // Simples Nacional
  const selAnexo = document.getElementById('sel-anexo');
  Object.entries(TABELAS.simples.anexos).forEach(([chave, a]) => {
    selAnexo.add(new Option(a.nome, chave));
  });
  const campoFolha = document.getElementById('campo-folha');
  selAnexo.addEventListener('change', () => {
    campoFolha.hidden = selAnexo.value !== 'V';
  });

  document.getElementById('form-simples').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const rbt12 = numero(f.rbt12.value);
    const mes = numero(f.mes.value);
    if (rbt12 <= 0 || mes <= 0) return erro('res-simples', 'Informe a receita dos 12 meses e o faturamento do mês.');
    const folha = selAnexo.value === 'V' && f.folha.value ? numero(f.folha.value) : null;
    const r = Calculos.calcularSimples({ rbt12, faturamentoMes: mes, anexo: selAnexo.value, folha12: folha });
    if (r.erro) return erro('res-simples', r.erro);
    const notaFatorR =
      r.fatorR === null
        ? ''
        : `<p class="ajuda">Fator R: ${pct(r.fatorR)} — ${
            r.anexo === 'III'
              ? 'igual ou acima de 28%, então a tributação segue o Anexo III.'
              : 'abaixo de 28%, então a tributação segue o Anexo V.'
          }</p>`;
    mostrar('res-simples', `
      <div class="destaque">
        <span>DAS do mês</span>
        <strong>${brl.format(r.das)}</strong>
        <small>Alíquota efetiva: ${pct(r.aliquotaEfetiva)}</small>
      </div>
      <table>
        ${linha('Anexo aplicado', r.nomeAnexo)}
        ${linha('Faixa de receita', r.faixa + 'ª')}
        ${linha('Alíquota nominal', pct(r.aliquotaNominal, 1))}
        ${linha('Parcela a deduzir', brl.format(r.parcelaDeduzir))}
        ${linha('Alíquota efetiva', pct(r.aliquotaEfetiva), 'total')}
      </table>
      ${notaFatorR}
    `);
  });

  // Por dentro / por fora
  document.getElementById('form-dentrofora').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const valor = numero(f.valor.value);
    const aliquota = numero(f.aliquota.value) / 100;
    if (valor <= 0 || aliquota <= 0) return erro('res-dentrofora', 'Informe valor e alíquota maiores que zero.');
    const r = Calculos.calcularPorDentroPorFora({ valor, aliquota, modo: f.modo.value });
    if (r.erro) return erro('res-dentrofora', r.erro);
    const equivalente =
      f.modo.value === 'dentro'
        ? `Equivale a ${pct(r.aliquotaSobreBase)} calculado por fora sobre o valor sem imposto.`
        : `Equivale a ${pct(r.aliquotaSobreTotal)} do valor total com imposto.`;
    mostrar('res-dentrofora', `
      <div class="destaque">
        <span>Valor com imposto</span>
        <strong>${brl.format(r.comImposto)}</strong>
        <small>${equivalente}</small>
      </div>
      <table>
        ${linha('Valor sem imposto', brl.format(r.semImposto))}
        ${linha('Imposto', brl.format(r.imposto))}
        ${linha('Valor com imposto', brl.format(r.comImposto), 'total')}
      </table>
    `);
  });

  // Alíquota efetiva
  document.getElementById('form-efetiva').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const r = Calculos.calcularAliquotaEfetiva({ base: numero(f.base.value), imposto: numero(f.imposto.value) });
    if (r.erro) return erro('res-efetiva', r.erro);
    mostrar('res-efetiva', `
      <div class="destaque">
        <span>Alíquota efetiva</span>
        <strong>${pct(r.aliquota)}</strong>
        <small>Valor líquido: ${brl.format(r.liquido)}</small>
      </div>
    `);
  });
})();
