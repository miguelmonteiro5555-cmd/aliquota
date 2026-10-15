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
  const destaque = (titulo, valor, nota) =>
    `<div class="destaque"><span>${titulo}</span><strong>${valor}</strong><small>${nota}</small></div>`;

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

  // Listas preenchidas a partir das tabelas
  document.querySelectorAll('.sel-atividade').forEach((sel) => {
    Object.entries(TABELAS.irpj.presuncao).forEach(([chave, a]) => {
      sel.add(new Option(`${a.nome} — presunção ${pct(a.percentual, 1)}`, chave));
    });
  });
  const nomesRisco = ['leve', 'médio', 'grave'];
  document.querySelectorAll('.sel-rat').forEach((sel) => {
    TABELAS.inss.ratOpcoes.forEach((r, i) => sel.add(new Option(`${pct(r, 0)} — risco ${nomesRisco[i]}`, r)));
    sel.value = TABELAS.inss.ratOpcoes[1];
  });

  /** Mostra um grupo de campos ou outro conforme a opção marcada. */
  function alternar(form, nome, grupos) {
    const atualizar = () => {
      const valor = form.elements[nome].value;
      Object.entries(grupos).forEach(([opcao, id]) => {
        document.getElementById(id).hidden = opcao !== valor;
      });
    };
    form.querySelectorAll(`input[name=${nome}]`).forEach((r) => r.addEventListener('change', atualizar));
    atualizar();
  }

  // Resumo
  document.getElementById('form-resumo').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const receita = numero(f.receita.value);
    if (receita <= 0) return erro('res-resumo', 'Informe a receita bruta do mês.');
    const r = Calculos.calcularResumo({
      receita,
      atividade: f.atividade.value,
      aliquotaISS: numero(f.iss.value) / 100,
      folha: numero(f.folha.value),
      proLabore: numero(f.prolabore.value),
      rat: Number(f.rat.value),
    });
    if (r.erro) return erro('res-resumo', r.erro);
    const barras = r.itens
      .map(
        (i) => `
        <div class="barra-item">
          <div class="barra-rotulo"><span>${i.nome}</span><span>${brl.format(i.valor)} · ${pct(i.sobreReceita)} da receita</span></div>
          <div class="barra"><div class="barra-valor" style="width:${(i.participacao * 100).toFixed(1)}%"></div></div>
        </div>`
      )
      .join('');
    mostrar('res-resumo', `
      ${destaque('Total de IRPJ + INSS + ISS', brl.format(r.total), `Carga sobre a receita: ${pct(r.carga)}`)}
      ${barras}
      <table>
        ${linha('Receita bruta', brl.format(receita))}
        ${linha('Total dos 3 impostos', '− ' + brl.format(r.total))}
        ${linha('Sobra após os impostos', brl.format(receita - r.total), 'total')}
      </table>
      <p class="ajuda nota">O INSS inclui os 11% retidos do pró-labore do sócio. No Lucro Presumido o IRPJ é apurado por trimestre; aqui ele aparece como média mensal. Não estão incluídos CSLL, PIS e COFINS.</p>
    `);
  });

  // IRPJ
  const formIRPJ = document.getElementById('form-irpj');
  alternar(formIRPJ, 'regime', { presumido: 'campos-presumido', real: 'campos-real' });
  formIRPJ.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const regime = f.regime.value;
    const meses = Number(f.meses.value);
    const receita = numero(f.receita.value);
    const lucro = numero(f.lucro.value);
    if (regime === 'presumido' && receita <= 0) return erro('res-irpj', 'Informe a receita bruta do período.');
    if (regime === 'real' && lucro <= 0) return erro('res-irpj', 'Informe o lucro do período. Se houve prejuízo, não há IRPJ a pagar.');
    const r = Calculos.calcularIRPJ({ regime, receita, atividade: f.atividade.value, lucro, meses });
    const nota = r.aliquotaSobreReceita !== null ? `${pct(r.aliquotaSobreReceita)} da receita` : 'Lucro Real';
    mostrar('res-irpj', `
      ${destaque(`IRPJ do ${meses === 3 ? 'trimestre' : 'mês'}`, brl.format(r.valor), nota)}
      <table>
        ${regime === 'presumido' ? linha('Receita bruta', brl.format(receita)) : ''}
        ${regime === 'presumido' ? linha('Presunção de lucro', pct(r.presuncao, 1)) : ''}
        ${linha('Base de cálculo (lucro)', brl.format(r.base))}
        ${linha('IRPJ 15%', brl.format(r.normal))}
        ${linha(`Adicional 10% acima de ${brl.format(r.limiteAdicional)}`, brl.format(r.adicional))}
        ${linha('IRPJ a pagar', brl.format(r.valor), 'total')}
      </table>
      ${meses === 3 ? `<p class="ajuda nota">Pode ser pago em cota única ou em até 3 cotas mensais (mínimo de R$ 1.000 por cota).</p>` : ''}
    `);
  });

  // INSS
  const formINSS = document.getElementById('form-inss');
  alternar(formINSS, 'tipo', { empresa: 'campos-empresa', empregado: 'campos-empregado' });
  formINSS.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    if (f.tipo.value === 'empregado') {
      const salario = numero(f.salario.value);
      if (salario <= 0) return erro('res-inss', 'Informe o salário bruto.');
      const r = Calculos.calcularINSSEmpregado(salario);
      return mostrar('res-inss', `
        ${destaque('Desconto de INSS', brl.format(r.valor), `Alíquota efetiva: ${pct(r.aliquotaEfetiva)}${r.teto ? ' — no teto' : ''}`)}
        <table>
          ${r.detalhes.map((d) => linha(`${pct(d.aliquota, 1)} sobre ${brl.format(d.base)}`, brl.format(d.valor))).join('')}
          ${linha('Salário após INSS', brl.format(salario - r.valor), 'total')}
        </table>
      `);
    }
    const folha = numero(f.folha.value);
    const proLabore = numero(f.prolabore.value);
    if (folha <= 0 && proLabore <= 0) return erro('res-inss', 'Informe a folha de salários ou o pró-labore.');
    const r = Calculos.calcularINSSEmpresa({
      folha,
      proLabore,
      rat: Number(f.rat.value),
      fap: numero(f.fap.value) || 1,
      terceiros: numero(f.terceiros.value) / 100,
    });
    mostrar('res-inss', `
      ${destaque('Total da guia de INSS', brl.format(r.totalGuia), `Custo da empresa: ${pct(r.aliquotaSobreFolha)} sobre folha + pró-labore`)}
      <table>
        ${linha('Patronal 20% sobre a folha', brl.format(r.patronalFolha))}
        ${linha(`RAT ajustado (${pct(r.ratAjustado)})`, brl.format(r.ratValor))}
        ${linha('Terceiros', brl.format(r.terceirosValor))}
        ${linha('Patronal 20% sobre o pró-labore', brl.format(r.patronalProLabore))}
        ${linha('Custo da empresa', brl.format(r.custoEmpresa), 'total')}
        ${linha('11% retido do sócio', brl.format(r.retidoSocio))}
        ${linha('Total da guia', brl.format(r.totalGuia), 'total')}
      </table>
      <p class="ajuda nota">O INSS descontado dos empregados também vai na guia; calcule-o na opção “Desconto do empregado”. Empresas do Simples Nacional (exceto Anexo IV) não pagam o patronal à parte.</p>
    `);
  });

  // ISS
  document.getElementById('form-iss').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const receita = numero(f.receita.value);
    if (receita <= 0) return erro('res-iss', 'Informe o valor dos serviços.');
    const r = Calculos.calcularISS({ receita, aliquota: numero(f.aliquota.value) / 100, retido: f.retido.checked });
    if (r.erro) return erro('res-iss', r.erro);
    mostrar('res-iss', `
      ${destaque('ISS', brl.format(r.valor), r.retido ? 'Retido e pago pelo tomador' : 'A recolher pela sua empresa')}
      <table>
        ${linha('Valor dos serviços', brl.format(receita))}
        ${linha('ISS', brl.format(r.valor))}
        ${linha('ISS a recolher pela empresa', brl.format(r.aRecolher))}
        ${linha('Valor recebido do cliente', brl.format(r.liquidoRecebido), 'total')}
      </table>
    `);
  });
})();
