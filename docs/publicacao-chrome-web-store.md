# Como publicar na Chrome Web Store

Passo a passo para publicar a extensão como **não listada**: só quem tem o link instala. É a
distribuição prevista na seção 12 da especificação. Os textos para colar no painel estão no fim.

Fontes: documentação oficial em <https://developer.chrome.com/docs/webstore/> (páginas *register*,
*publish*, *images*, *cws-dashboard-privacy* e *cws-dashboard-distribution*), consultada em
21/11/2026. As telas do painel mudam com o tempo; se algo não bater, confira lá.

---

## 0. Antes de começar: decisões

| Decisão | Recomendação |
| --- | --- |
| **De quem é a conta** | Use uma conta Google **da empresa** (ex.: `ti@...`), não uma pessoal. O e-mail de desenvolvedor **não pode ser trocado** depois de criada a conta, e transferir a extensão para outra conta é trabalhoso. |
| **Visibilidade** | **Não listada** (*Unlisted*). A opção **Privada** só serve para contas Google listadas como testadores ou para um domínio do Google Workspace; como o time usa contas Microsoft, ela não serve. |
| **Nome na loja** | O nome vem do `manifest.json`: "Predecessores no card (Azure Boards)". Citar o produto é aceito, mas o texto não pode sugerir que a extensão é da Microsoft. Por isso o ícone não usa o logo do Azure. Se o revisor reclamar, troque para "Predecessores no card para Azure Boards". |
| **Edge** | O time usa Edge, que instala extensões da Chrome Web Store. Também dá para publicar de graça na Edge Add-ons (seção 9). |

## 1. Preparar o pacote

```powershell
npm install
npm test
npm run zip
```

O `npm run zip` gera o build e cria **`predecessores-v0.1.0.zip`** na raiz do repositório, com o
`manifest.json` na raiz do zip. Ele falha se a versão do `manifest.json` for diferente da do
`package.json`, ou se faltar algum ícone.

Confira antes de enviar:

- [ ] Carregue a pasta `dist/` sem compactação e siga o [roteiro de teste](roteiro-de-teste.md).
- [ ] O pacote tem o ícone de 128×128 (`icons/icon128.png`), obrigatório para a loja.
- [ ] A versão é a que você quer publicar. Cada envio precisa de uma versão **maior** que a anterior.

## 2. Criar a conta de desenvolvedor (uma vez só)

1. Entre com a conta Google da empresa em <https://chrome.google.com/webstore/devconsole>.
2. Ligue a **verificação em duas etapas** nessa conta Google, se ainda não estiver ligada. O painel
   pede isso para publicar.
3. Aceite o contrato de desenvolvedor e as políticas.
4. Pague a **taxa de registro, que é única** (não é anual). A documentação não diz o valor;
   historicamente são US$ 5, cobrados no cartão.
5. Preencha o perfil da conta. O painel pergunta se a conta é de **comerciante** (*trader*); essa
   declaração vem da lei europeia (DSA). Uma empresa normalmente se declara comerciante, e aí o
   endereço e o telefone ficam visíveis para usuários da União Europeia. Se você restringir as
   regiões ao Brasil (passo 6), isso pesa menos.
6. *(Opcional, recomendado)* Em **Conta**, crie um **grupo de publicadores** (*group publisher*)
   ligado a um Google Group da empresa. Assim mais de uma pessoa consegue publicar atualizações.

> Contas novas podem ter no máximo 2 extensões publicadas. Para esta, basta.

## 3. Enviar o pacote

1. No painel, clique em **Adicionar novo item** (*Add new item*).
2. Escolha o `predecessores-v0.1.0.zip` e clique em **Enviar** (*Upload*).
3. O item é criado como rascunho e o painel abre as abas que precisam ser preenchidas.

## 4. Aba "Listagem na loja" (*Store listing*)

| Campo | O que pôr |
| --- | --- |
| Descrição | Texto do fim deste guia (seção A). |
| Categoria | *Ferramentas para desenvolvedores* (ou *Produtividade*, se ela não existir). |
| Idioma | Português (Brasil). |
| Ícone da loja | `icons/icon128.png` (128×128, já com a margem transparente que a loja pede). |
| **Capturas de tela** | **Pelo menos 1, de 1280×800** (ou 640×400). O ideal são até 5. Obrigatório. |
| Bloco promocional pequeno | 440×280. Opcional; sem ele, a extensão aparece depois das que têm. Para uma extensão não listada, não faz diferença. |
| Marquee | 1400×560. Opcional; pode deixar vazio. |
| Site e suporte | URL do repositório ou um e-mail de suporte da empresa. |

**Como tirar a captura em 1280×800 no Edge ou no Chrome:**

1. Abra um board com cards que tenham predecessores.
2. Abra o DevTools (F12) e ligue a barra de dispositivos (Ctrl+Shift+M).
3. Em *Dimensões*, escolha **Responsivo** e digite `1280` × `800`.
4. Abra o menu ⋮ da barra de dispositivos e clique em **Capturar captura de tela**.
5. Repita no taskboard e, se quiser, no tema escuro e com o tooltip do "+K" aberto.

> Cuidado com o que aparece na tela: a captura fica pública para quem tiver o link. Prefira um
> projeto de teste, ou títulos e nomes que possam ser mostrados.

## 5. Aba "Práticas de privacidade" (*Privacy practices*)

| Campo | O que pôr |
| --- | --- |
| Finalidade única | Texto da seção B. |
| Justificativa de `storage` | Texto da seção C. |
| Justificativa das permissões de host | Texto da seção C. |
| Código remoto | **"Não, não estou usando código remoto"**. Todo o JavaScript está dentro do pacote. |
| Uso de dados | Ver abaixo. |
| URL da política de privacidade | Link público para o `PRIVACIDADE.md` (ver abaixo). |

**Uso de dados.** A extensão lê, no navegador, títulos, estados e nomes e fotos de responsáveis dos
work items, e não envia nada para fora do Azure DevOps. Há duas leituras do formulário:

- **Mais segura (recomendada):** marque **"Conteúdo do site"** e **"Informações de identificação
  pessoal"** (por causa do nome do responsável). A política de privacidade explica que isso só é
  usado localmente.
- **Mínima:** não marque nenhum tipo, já que nada é enviado para fora do navegador.

Nos dois casos, marque as três certificações: não vende dados a terceiros; não usa nem transfere
dados para fins sem relação com a finalidade única; não usa para avaliar crédito ou empréstimos.

**URL da política de privacidade.** O revisor precisa conseguir abrir o link sem login:

- **Se o repositório no GitHub for público:** use
  `https://github.com/ivetech-sistemas/ado-boards-predecessor/blob/main/PRIVACIDADE.md`
  (depois do merge na `main`).
- **Se for privado:** publique o conteúdo do `PRIVACIDADE.md` numa página pública. Pode ser o site
  da Ivetech, o GitHub Pages de um repositório público ou uma página do Notion ou do Google Docs
  aberta para leitura.

## 6. Aba "Distribuição" (*Distribution*)

| Campo | O que pôr |
| --- | --- |
| Pagamento | Grátis. |
| Visibilidade | **Não listada** (*Unlisted*). |
| Regiões | Brasil (ou todas, se o time tiver gente fora). |

## 7. Enviar para revisão

1. Confira se todas as abas estão sem aviso vermelho.
2. Clique em **Enviar para revisão** (*Submit for review*).
3. No diálogo, decida:
   - **Publicar assim que for aprovado** (padrão); ou
   - desmarcar essa opção (**publicação adiada**). Depois de aprovado, você tem **até 30 dias** para
     clicar em publicar; passado o prazo, o item volta para rascunho.
4. A revisão vale para qualquer visibilidade, inclusive não listada. A documentação não dá prazo:
   costuma levar de algumas horas a poucos dias, e o primeiro envio tende a demorar mais. Ajuda ter
   poucas permissões e nenhum código remoto, que é o caso desta extensão.
5. Se precisar corrigir algo durante a revisão: **Cancelar revisão**, enviar o pacote novo e
   submeter de novo.

## 8. Distribuir para o time

Quando aprovar, a página do item mostra o link da loja
(`https://chromewebstore.google.com/detail/<nome>/<id>`).

- **Chrome:** abrir o link e clicar em **Usar no Chrome**.
- **Edge:** abrir o mesmo link. Na primeira vez, o Edge mostra a faixa **"Permitir extensões de
  outras lojas"**; clique em **Permitir** e depois em **Obter** (*Add to Chrome*).
- **Instalação forçada pela TI** (opcional): na política do Edge ou do Chrome
  `ExtensionInstallForcelist`, use
  `<id-da-extensão>;https://clients2.google.com/service/update2/crx`. O ID são os 32 caracteres no
  fim do link da loja.

Guarde o link no README do repositório e no canal do time.

## 9. (Opcional) Publicar também na Edge Add-ons

A loja do Edge é grátis e evita a faixa "outras lojas".

1. Entre em <https://partner.microsoft.com/dashboard/microsoftedge/> com uma conta Microsoft da
   empresa e cadastre-se no programa (sem taxa).
2. **Criar nova extensão**, enviar o **mesmo zip** e preencher a listagem: descrição, ícone,
   capturas e política de privacidade. Os textos deste guia servem.
3. Em *Disponibilidade*, escolha **Oculta** (*Hidden*), o equivalente a não listada.
4. Enviar. A revisão da Microsoft costuma levar alguns dias úteis.

## 10. Publicar uma atualização

1. Aumente a versão em **`manifest.json`** e em **`package.json`** (ex.: `0.1.0` → `0.1.1`).
2. Anote as mudanças no `CHANGELOG.md`.
3. Rode `npm test` e `npm run zip`.
4. No painel, abra o item, vá na aba **Pacote** (*Package*), clique em **Enviar novo pacote** e
   escolha o zip novo.
5. Clique em **Enviar para revisão**. Depois de aprovada, o navegador de cada pessoa atualiza
   sozinho, em algumas horas.

> Se uma versão nova pedir **permissão nova**, o navegador desliga a extensão até a pessoa aceitar.
> Evite acrescentar permissões sem necessidade.

## Checklist final

- [ ] Conta Google da empresa com verificação em duas etapas, taxa paga, perfil preenchido
- [ ] `npm test` passando e `npm run zip` gerado com a versão certa
- [ ] Pelo menos 1 captura de 1280×800, sem dado sensível
- [ ] Descrição, finalidade única e justificativas coladas (textos abaixo)
- [ ] "Sem código remoto" e certificações de uso de dados marcadas
- [ ] Política de privacidade numa URL pública
- [ ] Visibilidade **não listada**
- [ ] Link da loja no README e no canal do time

---

## Textos para colar

### A. Descrição (aba Listagem na loja)

```
Mostra nos cards do Azure Boards os predecessores que ainda não foram concluídos, sem precisar abrir o item.

Em cada card do board (Kanban) e do taskboard da sprint, aparece uma linha por predecessor em aberto:
• seta de "depende de";
• bolinha na cor do estado do predecessor, com o nome do estado no tooltip;
• foto (ou iniciais) do responsável;
• título em uma linha; o clique abre o predecessor numa nova aba, sem abrir o card.

Predecessores concluídos somem sozinhos. O estado é avaliado pela categoria do processo (Completed/Removed), então funciona em qualquer processo e idioma.

Funciona em boards de qualquer nível (Epics, Features, Backlog items) e no taskboard, inclusive com predecessores de outros projetos da mesma organização, em dev.azure.com e em *.visualstudio.com. Tema claro e escuro.

Privacidade: a extensão lê os dados direto da API do Azure DevOps com a sua própria sessão. Nada é enviado para fora do Azure DevOps, não há telemetria e nenhuma credencial é guardada.

Opções: ligar e desligar no board e no taskboard, máximo de linhas por card, abrir na mesma aba ou em nova aba, esconder em card concluído e validade do cache.

Esta extensão não é afiliada nem endossada pela Microsoft. Azure DevOps e Azure Boards são marcas da Microsoft.
```

### B. Finalidade única (aba Práticas de privacidade)

```
Mostrar, dentro dos cards do board e do taskboard do Azure Boards, os predecessores ainda não concluídos de cada work item, com estado, responsável e link para o predecessor.
```

### C. Justificativas das permissões

**`storage`:**

```
Salvar as preferências da página de opções (ligar no board/taskboard, máximo de linhas por card, abrir em nova aba, esconder em card concluído e validade do cache). Nenhum dado de work item é salvo.
```

**Permissões de host (`https://dev.azure.com/*` e `https://*.visualstudio.com/*`):**

```
São os dois domínios do Azure DevOps. A extensão precisa deles para (1) acrescentar as linhas de predecessores aos cards da página do board e do taskboard e (2) ler, na API REST do Azure DevOps da própria organização do usuário e com a sessão dele, os links de predecessor e os dados (título, estado, responsável) dos predecessores. Nenhuma requisição vai para outro domínio.
```
