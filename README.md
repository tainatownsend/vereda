# Vereda

> **Um passo por dia. Uma jornada para toda a vida.**

O Vereda é uma experiência digital gratuita e sem fins lucrativos para pessoas
que desejam estudar as obras fundamentais do Espiritismo com clareza,
constância e tranquilidade.

O aplicativo não substitui as obras, não pretende ensinar a Doutrina e não
transforma o estudo em competição. Seu papel é remover barreiras, orientar o
próximo passo e ajudar cada estudante a continuar no próprio ritmo.

## Por que o Vereda existe

Muitas pessoas desejam estudar as obras fundamentais do Espiritismo, mas não
sabem por onde começar ou encontram dificuldade para manter uma rotina.

O Vereda existe para diminuir essa distância.

Acreditamos que:

- compreender é mais importante do que terminar rapidamente;
- constância é mais importante do que perfeição;
- acessibilidade é uma forma de respeito;
- a tecnologia deve desaparecer para que o conteúdo permaneça;
- retornar depois de uma pausa deve ser acolhedor, nunca constrangedor.

Leia a [visão do produto](docs/vision.md) e os
[princípios de produto](docs/product-principles.md).

## Princípios essenciais

- **Reading first:** a leitura é sempre a protagonista.
- **Calm by design:** serenidade é uma decisão de produto.
- **One primary action:** cada tela deve deixar claro o próximo passo.
- **Accessible by default:** acessibilidade não é um modo opcional.
- **No guilt:** o Vereda nunca utiliza culpa como mecanismo de motivação.
- **Nonprofit by purpose:** não existem anúncios, recursos premium artificiais
  ou decisões guiadas por maximização de tempo de tela.

## Estado do projeto

O Vereda está em evolução ativa. A base funcional já inclui autenticação,
biblioteca, leitura, acompanhamento de progresso, metas pessoais, notificações
e modo escuro. A evolução atual está concentrada em identidade visual,
acessibilidade, UX writing e refinamento da experiência de estudo.

Consulte o [roadmap](docs/roadmap.md).

## Tecnologia

- React
- Vite
- React Router
- Zustand
- Supabase
- Tailwind CSS
- Vite PWA

## Desenvolvimento local

### Requisitos

- Node.js compatível com o projeto
- npm
- projeto Supabase configurado

### Instalação

```bash
git clone https://github.com/tainatownsend/vereda.git
cd vereda
npm install
```

Crie um arquivo `.env.local`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Execute:

```bash
npm run dev
```

### Validação

```bash
npm run lint
npm run build
```

## Design system

O **VES — Vereda Editorial System** documenta tokens, componentes e padrões
visuais usados no produto:

- [Visão geral](design/ves/README.md)
- [Tokens](design/ves/tokens.md)
- [Componentes](design/ves/components.md)

## Contribuição

Leia o [guia de contribuição](CONTRIBUTING.md) antes de abrir uma issue ou Pull
Request.

## Compromisso sem fins lucrativos

O Vereda foi criado para servir. Não exibe anúncios e não vende recursos
essenciais. Caso o projeto gere receita no futuro, a intenção da fundadora é
destiná-la ao apoio de uma casa espírita ou iniciativa alinhada ao propósito do
projeto.

## Licença

A licença open source definitiva será documentada antes da primeira versão
pública estável.
