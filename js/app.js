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

  let abrindo = true;

  function mostrar(id, html) {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.hidden = false;
    if (!abrindo) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  // Alíquotas ajustáveis: cada campo aponta para um valor em TABELAS
  const PADRAO = JSON.parse(JSON.stringify(TABELAS));
  const CHAVE_AJUSTES = 'aliquota:ajustes';
  const pegar = (obj, caminho) => caminho.reduce((o, k) => o[k], obj);
  const definir = (obj, caminho, valor) => {
    pegar(obj, caminho.slice(0, -1))[caminho[caminho.length - 1]] = valor;
  };

  const grupos = [
    {
      titulo: 'IRPJ',
      campos: [
        { rotulo: 'Alíquota do IRPJ', caminho: ['irpj', 'aliquota'], tipo: 'pct' },
        { rotulo: 'Adicional', caminho: ['irpj', 'adicional'], tipo: 'pct' },
        { rotulo: 'Lucro mensal livre do adicional (R$)', caminho: ['irpj', 'limiteAdicionalMensal'], tipo: 'brl' },
        ...Object.entries(TABELAS.irpj.presuncao).map(([chave, a]) => ({
          rotulo: `Presunção — ${a.nome}`,
          caminho: ['irpj', 'presuncao', chave, 'percentual'],
          tipo: 'pct',
        })),
      ],
    },
    {
      titulo: 'INSS da empresa',
      campos: [
        { rotulo: 'Patronal (folha e pró-labore)', caminho: ['inss', 'patronal'], tipo: 'pct' },
        { rotulo: 'Terceiros (padrão)', caminho: ['inss', 'terceirosPadrao'], tipo: 'pct' },
        { rotulo: 'Retido do sócio no pró-labore', caminho: ['inss', 'socioProLabore'], tipo: 'pct' },
        { rotulo: 'Retido na nota (cessão de mão de obra)', caminho: ['inss', 'retencaoNota'], tipo: 'pct' },
        ...TABELAS.inss.ratOpcoes.map((_, i) => ({
          rotulo: `RAT — risco ${['leve', 'médio', 'grave'][i]}`,
          caminho: ['inss', 'ratOpcoes', i],
          tipo: 'pct',
        })),
      ],
    },
    {
      titulo: 'INSS do empregado (faixas)',
      campos: TABELAS.inss.faixas.flatMap((_, i) => [
        { rotulo: `Faixa ${i + 1} — alíquota`, caminho: ['inss', 'faixas', i, 'aliquota'], tipo: 'pct' },
        { rotulo: `Faixa ${i + 1} — até (R$)`, caminho: ['inss', 'faixas', i, 'ate'], tipo: 'brl' },
      ]),
    },
    {
      titulo: 'ISS',
      campos: [{ rotulo: 'Alíquota padrão do município', caminho: ['iss', 'padrao'], tipo: 'pct' }],
    },
  ];
  const todosCampos = grupos.flatMap((g) => g.campos);
  const idCampo = (c) => 'ajuste-' + c.caminho.join('-');
  const formatarAjuste = (c, v) =>
    c.tipo === 'pct'
      ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.getElementById('campos-ajustes').innerHTML = grupos
    .map(
      (g) => `
      <fieldset class="grupo-ajustes">
        <legend>${g.titulo}</legend>
        <div class="grade-ajustes">
          ${g.campos
            .map(
              (c) => `<label for="${idCampo(c)}">${c.rotulo}${c.tipo === 'pct' ? ' (%)' : ''}
                <input type="text" inputmode="decimal" id="${idCampo(c)}">
              </label>`
            )
            .join('')}
        </div>
      </fieldset>`
    )
    .join('');

  function mostrarAjustes() {
    todosCampos.forEach((c) => {
      document.getElementById(idCampo(c)).value = formatarAjuste(c, pegar(TABELAS, c.caminho));
    });
  }

  /** Atualiza listas e valores iniciais dos formulários que dependem das alíquotas. */
  function atualizarFormularios() {
    document.querySelectorAll('.sel-atividade').forEach((sel) => {
      const escolhido = sel.value;
      sel.innerHTML = '';
      Object.entries(TABELAS.irpj.presuncao).forEach(([chave, a]) => {
        sel.add(new Option(`${a.nome} — presunção ${pct(a.percentual, 1)}`, chave));
      });
      if (escolhido) sel.value = escolhido;
    });
    document.querySelectorAll('.sel-rat').forEach((sel) => {
      const indice = sel.selectedIndex >= 0 ? sel.selectedIndex : 1;
      sel.innerHTML = '';
      TABELAS.inss.ratOpcoes.forEach((r, i) => sel.add(new Option(`${pct(r, 1)} — risco ${nomesRisco[i]}`, r)));
      sel.selectedIndex = indice;
    });
    const issPadrao = formatarAjuste({ tipo: 'pct' }, TABELAS.iss.padrao);
    document.querySelector('#form-resumo [name=iss]').value = issPadrao;
    document.querySelector('#form-iss [name=aliquota]').value = issPadrao;
    document.querySelector('#form-compra [name=iss]').value = issPadrao;
    document.querySelectorAll('.taxa-retencao').forEach((el) => {
      el.textContent = pct(TABELAS.inss.retencaoNota, 0);
    });
    document.querySelector('#form-inss [name=terceiros]').value = formatarAjuste({ tipo: 'pct' }, TABELAS.inss.terceirosPadrao);
  }

  function aplicarSalvos() {
    let salvos = {};
    try {
      salvos = JSON.parse(localStorage.getItem(CHAVE_AJUSTES) || '{}');
    } catch (_) {
      salvos = {};
    }
    todosCampos.forEach((c) => {
      const v = salvos[c.caminho.join('.')];
      if (typeof v === 'number' && Number.isFinite(v)) definir(TABELAS, c.caminho, v);
    });
  }

  const nomesRisco = ['leve', 'médio', 'grave'];
  aplicarSalvos();
  mostrarAjustes();
  atualizarFormularios();

  const statusAjustes = document.getElementById('status-ajustes');
  document.getElementById('form-ajustes').addEventListener('submit', (e) => {
    e.preventDefault();
    const novos = {};
    for (const c of todosCampos) {
      const texto = document.getElementById(idCampo(c)).value.trim();
      const n = numero(texto);
      if (!/^-?[\d.,]+$/.test(texto) || n < 0 || (c.tipo === 'pct' && n >= 100)) {
        statusAjustes.textContent = `Revise “${c.rotulo}”: use um número${c.tipo === 'pct' ? ' entre 0 e 100' : ' maior ou igual a zero'}.`;
        statusAjustes.className = 'status erro';
        document.getElementById(idCampo(c)).focus();
        return;
      }
      novos[c.caminho.join('.')] = c.tipo === 'pct' ? n / 100 : n;
    }
    todosCampos.forEach((c) => definir(TABELAS, c.caminho, novos[c.caminho.join('.')]));
    let salvou = true;
    try {
      localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(novos));
    } catch (_) {
      salvou = false;
    }
    mostrarAjustes();
    atualizarFormularios();
    statusAjustes.textContent = salvou
      ? 'Alíquotas salvas. Os próximos cálculos já usam os novos valores.'
      : 'Alíquotas aplicadas, mas este navegador não permitiu salvar. Elas valem até fechar a página.';
    statusAjustes.className = 'status';
  });

  document.getElementById('restaurar-padrao').addEventListener('click', () => {
    todosCampos.forEach((c) => definir(TABELAS, c.caminho, pegar(PADRAO, c.caminho)));
    try {
      localStorage.removeItem(CHAVE_AJUSTES);
    } catch (_) {
      /* sem armazenamento: nada a remover */
    }
    mostrarAjustes();
    atualizarFormularios();
    statusAjustes.textContent = `Alíquotas de ${TABELAS.ano} restauradas.`;
    statusAjustes.className = 'status';
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
      ${r.iss.aviso ? `<p class="alerta">${r.iss.aviso}</p>` : ''}
      <p class="ajuda nota">O INSS inclui os ${pct(TABELAS.inss.socioProLabore, 0)} retidos do pró-labore do sócio. No Lucro Presumido o IRPJ é apurado por trimestre; aqui ele aparece como média mensal. Não estão incluídos CSLL, PIS e COFINS.</p>
    `);
  });

  // Por compra: cada compra é calculada sozinha e pode ir para uma lista
  const CHAVE_COMPRAS = 'aliquota:compras';
  const escapar = (t) =>
    String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let compras = [];
  try {
    compras = JSON.parse(localStorage.getItem(CHAVE_COMPRAS) || '[]');
    if (!Array.isArray(compras)) compras = [];
  } catch (_) {
    compras = [];
  }
  let ultimaCompra = null;

  function salvarCompras() {
    try {
      localStorage.setItem(CHAVE_COMPRAS, JSON.stringify(compras));
    } catch (_) {
      /* sem armazenamento: a lista vale até fechar a página */
    }
  }

  function desenharCompras() {
    const el = document.getElementById('lista-compras');
    if (!compras.length) {
      el.innerHTML = '<p class="ajuda vazio">Nenhuma compra lançada. Calcule uma compra acima e toque em “Adicionar à lista” para somar várias.</p>';
      return;
    }
    const s = Calculos.somarCompras(compras);
    el.innerHTML = `
      <div class="tabela-rolagem">
        <table class="tabela-compras">
          <thead><tr><th>Compra</th><th>Valor</th><th>Impostos</th><th></th></tr></thead>
          <tbody>
            ${compras
              .map(
                (c, i) => `<tr>
                  <td>${escapar(c.descricao || 'Compra ' + (i + 1))}</td>
                  <td>${brl.format(c.valor)}</td>
                  <td>${brl.format(c.total)}</td>
                  <td><button type="button" class="remover" data-indice="${i}" aria-label="Remover ${escapar(c.descricao || 'compra ' + (i + 1))}">✕</button></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <table>
        ${linha(`${s.quantidade} compra${s.quantidade > 1 ? 's' : ''}`, brl.format(s.valor))}
        ${linha('IRPJ', brl.format(s.irpj))}
        ${linha('ISS', brl.format(s.iss))}
        ${linha(`Total de impostos — ${pct(s.carga)}`, brl.format(s.total), 'total')}
        ${linha('Sobra após os impostos', brl.format(s.sobra), 'total')}
        ${s.inss ? linha('INSS retido nas notas (a descontar da guia)', brl.format(s.inss)) : ''}
      </table>
      <button type="button" class="secundario largo" id="limpar-compras">Limpar lista</button>
    `;
  }

  document.getElementById('lista-compras').addEventListener('click', (e) => {
    const remover = e.target.closest('.remover');
    if (remover) {
      compras.splice(Number(remover.dataset.indice), 1);
    } else if (e.target.id === 'limpar-compras') {
      compras = [];
    } else {
      return;
    }
    salvarCompras();
    desenharCompras();
  });

  document.getElementById('form-compra').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const r = Calculos.calcularPorCompra({
      valor: numero(f.valor.value),
      atividade: f.atividade.value,
      aliquotaISS: numero(f.iss.value) / 100,
      issRetido: f.issRetido.checked,
      inssRetido: f.inssRetido.checked,
    });
    if (r.erro) return erro('res-compra', r.erro);
    ultimaCompra = { ...r, descricao: f.descricao.value.trim() };
    const retencoes = r.retidoPeloCliente
      ? `${linha('Retido pelo cliente', '− ' + brl.format(r.retidoPeloCliente))}${linha('Você recebe', brl.format(r.recebido), 'total')}`
      : '';
    mostrar('res-compra', `
      ${destaque('Impostos desta compra', brl.format(r.total), `${pct(r.carga)} do valor · sobra ${brl.format(r.sobra)}`)}
      ${r.iss.aviso ? `<p class="alerta">${r.iss.aviso}</p>` : ''}
      <table>
        ${linha('Valor da compra', brl.format(r.valor))}
        ${linha(`IRPJ — ${pct(TABELAS.irpj.aliquota, 1)} sobre ${pct(r.presuncao, 1)} do valor`, brl.format(r.irpj))}
        ${linha(`ISS${r.iss.retido ? ' (retido)' : ''}`, brl.format(r.iss.valor))}
        ${linha('Total de impostos', brl.format(r.total), 'total')}
        ${r.inss ? linha(`INSS retido — ${pct(TABELAS.inss.retencaoNota, 1)}`, brl.format(r.inss)) : ''}
        ${retencoes}
      </table>
      <p class="ajuda nota">O adicional de 10% do IRPJ depende do lucro do mês inteiro, por isso não entra no cálculo de uma compra. ${r.inss ? 'O INSS retido pode ser descontado da guia de INSS da empresa.' : ''}</p>
      <button type="button" class="secundario largo" id="adicionar-compra">Adicionar à lista</button>
    `);
  });

  document.getElementById('res-compra').addEventListener('click', (e) => {
    if (e.target.id !== 'adicionar-compra' || !ultimaCompra) return;
    compras.push(ultimaCompra);
    ultimaCompra = null;
    salvarCompras();
    desenharCompras();
    e.target.disabled = true;
    e.target.textContent = 'Adicionada à lista';
    const form = document.getElementById('form-compra');
    form.elements.descricao.value = '';
    form.elements.valor.value = '';
  });

  desenharCompras();

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
        ${linha(`IRPJ ${pct(TABELAS.irpj.aliquota, 1)}`, brl.format(r.normal))}
        ${linha(`Adicional ${pct(TABELAS.irpj.adicional, 1)} acima de ${brl.format(r.limiteAdicional)}`, brl.format(r.adicional))}
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
        ${linha(`Patronal ${pct(TABELAS.inss.patronal, 1)} sobre a folha`, brl.format(r.patronalFolha))}
        ${linha(`RAT ajustado (${pct(r.ratAjustado)})`, brl.format(r.ratValor))}
        ${linha('Terceiros', brl.format(r.terceirosValor))}
        ${linha(`Patronal ${pct(TABELAS.inss.patronal, 1)} sobre o pró-labore`, brl.format(r.patronalProLabore))}
        ${linha('Custo da empresa', brl.format(r.custoEmpresa), 'total')}
        ${linha(`${pct(TABELAS.inss.socioProLabore, 1)} retido do sócio`, brl.format(r.retidoSocio))}
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
      ${r.aviso ? `<p class="alerta">${r.aviso}</p>` : ''}
      <table>
        ${linha('Valor dos serviços', brl.format(receita))}
        ${linha('ISS', brl.format(r.valor))}
        ${linha('ISS a recolher pela empresa', brl.format(r.aRecolher))}
        ${linha('Valor recebido do cliente', brl.format(r.liquidoRecebido), 'total')}
      </table>
    `);
  });
  // Abre com um exemplo já calculado, para mostrar o que o app faz
  const formResumo = document.getElementById('form-resumo');
  if (!formResumo.elements.receita.value) {
    formResumo.elements.receita.value = '50.000,00';
    formResumo.elements.folha.value = '10.000,00';
    formResumo.elements.prolabore.value = '5.000,00';
    document.getElementById('aviso-exemplo').hidden = false;
    formResumo.requestSubmit();
    formResumo.addEventListener('input', () => {
      document.getElementById('aviso-exemplo').hidden = true;
    }, { once: true });
  }

  abrindo = false;

  // Instalação como app (PWA) e uso offline
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
