# Plano — Meu Orçamento

## Objetivo e abordagem

Construir um app móvel Expo/React Native em português do Brasil, adaptado a telas estreitas e também executável no navegador. O produto permite registrar receitas e despesas por categoria, organizar despesas como mensais fixas, mensais variáveis ou esporádicas, definir limites por categoria e mês, acompanhar o saldo restante, comparar gastos e consultar análises simples. Os dados financeiros permanecem locais: `localStorage` no navegador e AsyncStorage no dispositivo; nenhuma transação ou orçamento será enviado ao servidor ou banco de dados. O starter móvel gerencia serviços automaticamente, mas o app não os usará para seus dados.

A navegação terá quatro áreas: **Resumo**, **Lançamentos**, **Orçamentos** e **Dados**. Um seletor mensal compartilhado mantém o mesmo período em todas as áreas. O mês atual é o padrão e as setas permitem avançar ou retroceder; períodos futuros podem receber orçamentos e lançamentos, sem simular recorrências automaticamente.

A camada de domínio será tipada e independente da apresentação. Uma transação conterá identificador, natureza (receita/despesa), valor em centavos, data ISO, categoria, descrição opcional e classe da despesa. O orçamento será um limite mensal em centavos por categoria. Totais, saldo, participação por categoria, progresso de orçamento, tendência dos últimos seis meses e textos de insight serão derivados dos registros, nunca armazenados como cópias sujeitas a divergência. Valores serão arredondados em centavos e formatados como BRL. Importações CSV serão analisadas e validadas antes de gravar, com uma etapa de pré-visualização e confirmação.

Para CSV, usar arquivo com cabeçalho e suporte aos campos de lançamentos (`tipo`, `valor`, `data`, `categoria`, `descricao`, `classeDespesa`) e, no formato exportado, uma coluna `registro` para distinguir lançamentos e orçamentos mensais. A importação reconhecerá os próprios arquivos exportados e cabeçalhos correntes em português; mostrará contagem, erros e amostra antes da confirmação. Na Web, entrada por seletor de arquivo e saída por download do navegador. Em Android/iOS, os módulos Expo compatíveis com o SDK instalado usarão seletor de documento e compartilhamento de arquivo quando disponíveis. Nenhum dado pessoal será enviado a um serviço remoto.

## Estrutura do projeto

- `app/(tabs)/_layout.tsx`: abas inferiores, ícones, alturas seguras e identidade de navegação.
- `app/(tabs)/index.tsx`: painel do mês selecionado, resumo, distribuição, tendência e insights.
- `app/(tabs)/transactions.tsx`: lista mensal, filtros por natureza/classe e fluxos de criação, edição e exclusão.
- `app/(tabs)/budgets.tsx`: limites por categoria, valores realizados e saldo/orçamento disponível.
- `app/(tabs)/data.tsx`: importação com validação e prévia, exportação CSV e explicação de armazenamento local.
- `components/budget/`: seletor de mês, cartão de saldo, linhas de progresso, gráficos SVG, formulários e estados vazios reutilizáveis.
- `lib/budget/types.ts`, `categories.ts`, `dates.ts`, `calculations.ts`: domínio, categorias sugeridas, período e agregações.
- `lib/budget/storage.ts`, `BudgetProvider.tsx`: hidratação e persistência local multiplataforma, com proteção para não sobrescrever dados antes do carregamento inicial.
- `lib/budget/csv.ts`: parser, validação, prévia, serialização e escape seguro de CSV.
- `assets/images/`: ícones de launcher, splash, favicon e variantes Android alinhados à marca.
- `TODO.md`: resultados independentes e critérios explícitos extraídos do pedido.

A implementação reutilizará Expo Router, React Native, NativeWind, `@react-native-async-storage/async-storage` e `react-native-svg` já instalados. Dependências Expo para seleção/compartilhamento de arquivos serão acrescentadas apenas se a implementação multiplataforma do CSV precisar delas, respeitando o lockfile e o SDK existente. Não serão alterados os identificadores nativos gerados nem as portas fixas 8081/3000.

## Direção visual

Estilos distintos considerados (probabilidades amostradas na cauda baixa): **livro-caixa editorial, 0,07**; **cartografia financeira neo-brutalista, 0,04**; **caderno botânico analógico, 0,02**. Escolha: livro-caixa editorial.

- **Movimento de design:** editorialismo suíço contemporâneo aplicado a uma ferramenta financeira cotidiana, combinando hierarquia tipográfica, respiro e precisão de tabela.
- **Princípios centrais:** leitura financeira imediata; números e categorias sempre claros; ações curtas e alcançáveis com uma mão; dados locais com linguagem transparente.
- **Filosofia de cor:** fundo marfim suave reduz o brilho de uma tela usada para conferir números; verde-pinho transmite estabilidade e indica valores saudáveis; tinta escura mantém contraste; terracota aparece apenas em alertas e excesso de orçamento.
- **Paradigma de layout:** fluxo vertical de extrato editorial, não uma grade de widgets. Saldo primeiro, mês como eixo de navegação, seguido por blocos de comparação e uma lista de atividade. Seções usam divisórias e alinhamento de valores, com cartões apenas para o saldo e chamadas de ação.
- **Elementos assinatura:** traço vertical verde para indicar fluxo positivo; cápsulas discretas para classe da despesa; progresso de orçamento com marcador de limite e cor terracota somente ao exceder.
- **Interação:** mês e abas são persistentes; botões têm alvos grandes; ações de edição preservam o contexto do mês; exclusão pede confirmação; importação nunca grava antes da prévia e confirmação.
- **Animação:** transições breves e suaves de cerca de 160–220 ms para entrada de modal e mudança de mês; barras de orçamento crescem ao atualizar; sem movimento contínuo ou animação que atrase a leitura.
- **Tipografia:** família de sistema do dispositivo para texto e títulos, com peso e escala editorial; valores principais grandes e com algarismos alinhados, rótulos menores em caixa alta discreta. Evitar fonte remota, para funcionamento imediato/offline.
- **Essência da marca:** um livro-caixa pessoal que torna claro quanto foi, quanto falta e onde ajustar; personalidade: serena, precisa e acolhedora.
- **Voz:** direta, humana e sem julgamento. Exemplos: “Seu mês, sem mistério.” e “Restaurantes passou 32% do limite combinado.”
- **Marca e wordmark:** símbolo quadrado de um “M” construído por duas colunas de livro-caixa e uma linha de saldo que sobe, em branco sobre verde-pinho; nome “Meu Orçamento” em composição tipográfica simples.
- **Cor proprietária:** verde-pinho profundo `#176B52`, apoiado por marfim `#F7F5EF`, tinta `#1E2A25` e terracota de alerta `#BF5A43`.

## Restrições materiais

O aplicativo não requer login, serviços remotos, nuvem ou sincronização entre dispositivos. A persistência do navegador é específica ao navegador/perfil em que o usuário o utiliza; limpar os dados do navegador os remove. O plano não contempla aconselhamento financeiro, sincronização bancária ou acesso automático a contas. A importação CSV valida os dados e evita duplicar lançamentos já presentes por identificador/linha equivalente quando o arquivo exportado o permitir.
