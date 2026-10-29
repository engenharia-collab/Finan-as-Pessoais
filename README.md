# Meu Orçamento — pacote para GitHub

Este pacote contém o código-fonte do app Expo/React Native e os arquivos de configuração necessários ao projeto. O armazenamento financeiro da versão web é local ao navegador (`localStorage`); os dados não são sincronizados entre navegadores ou aparelhos. Exporte CSV regularmente para manter uma cópia de segurança.

## Como enviar ao GitHub

1. Crie um repositório novo no GitHub. Se os arquivos ou o histórico forem privados, mantenha o repositório privado.
2. Baixe e extraia `meu-orcamento-github.zip`.
3. Envie **o conteúdo da pasta `meu-orcamento/` para a raiz do repositório** — não envie o ZIP como único arquivo.

Também é possível enviar com Git, depois de extrair:

```bash
git init
git add .
git commit -m "Adicionar Meu Orçamento"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Substitua a URL de exemplo pelo endereço do repositório criado. Caso a pasta já tenha um repositório Git próprio, não execute `git init`; adicione o remoto e faça o push usando seu fluxo habitual.

## Como executar em desenvolvimento

Requer Node.js compatível com o Expo deste projeto e pnpm 9.12.0 (o campo `packageManager` registra a versão usada).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:metro
```

O comando `pnpm dev:metro` inicia o Expo Web. Em outro terminal, rode `pnpm check` para verificar os tipos e `pnpm test` para executar os testes.

As funções de orçamento, lançamentos e CSV foram desenvolvidas para uso local e não precisam de credenciais de API. O repositório também contém código de infraestrutura e serviços herdados do starter Expo; esses serviços opcionais podem exigir configuração adicional caso sejam usados.

## O que não incluir no GitHub

Não adicione `node_modules/`, `.expo/`, `.git/`, arquivos `.env`, chaves, tokens ou outros segredos. O ZIP preparado já exclui o diretório `.git`, dependências instaladas e o arquivo interno de identificação do projeto Manus. Não publique credenciais em repositório público.

Para distribuir uma versão nativa iOS/Android, personalize antes os identificadores de aplicativo (bundle identifier/package e esquema de deep link) em `app.config.ts` e nas referências correspondentes do projeto; a exportação fornecida é o código-fonte, não um APK/IPA.
