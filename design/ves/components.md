# Componentes do VES

## Objetivo

Definir a missão, o comportamento e os requisitos mínimos dos componentes
fundamentais.

## Button

### Missão

Convidar o estudante a realizar o próximo passo.

### Requisitos

- uma ação principal visualmente dominante por contexto;
- altura recomendada de 56 px;
- label descritivo;
- foco visível;
- estados hover, active, loading, disabled e error;
- não comunicar apenas por cor;
- evitar labels genéricos como “OK” quando uma ação específica for possível.

## Input

### Missão

Permitir entrada de dados com segurança e clareza.

### Requisitos

- label sempre visível;
- placeholder apenas como exemplo;
- altura recomendada de 56 px;
- mensagem de erro próxima ao campo;
- foco de alto contraste;
- suporte a preenchimento automático;
- tipo de teclado adequado;
- botão de revelar senha quando aplicável.

## Reading Card

### Missão

Fazer o estudante retomar a leitura com baixo esforço.

### Hierarquia

1. contexto: “Continue sua leitura”;
2. nome da obra;
3. ponto atual;
4. duração estimada;
5. progresso;
6. ação principal.

### Emoção

- continuidade;
- confiança;
- tranquilidade.

### Não incluir

- competição;
- streak;
- excesso de métricas;
- decoração que compete com o título;
- mensagens de cobrança.

## Progress

### Missão

Mostrar continuidade, não desempenho.

### Requisitos

- apresentar o valor em texto;
- incluir nome acessível;
- não enfatizar o que “falta”;
- evitar cores alarmantes para progresso baixo;
- nunca comparar estudantes.

## Book Card

### Missão

Ajudar o estudante a compreender uma obra e decidir com segurança.

### Conteúdo possível

- título;
- autor;
- descrição curta;
- papel no caminho recomendado;
- extensão;
- nível introdutório ou aprofundado;
- progresso, quando aplicável.

## Empty State

### Missão

Transformar ausência em orientação.

### Requisitos

- explicar o estado;
- oferecer um próximo passo;
- evitar linguagem de falha;
- manter apenas uma ação principal.

## Bottom Navigation

### Missão

Oferecer orientação espacial previsível.

### Direção inicial

Quatro destinos:

- Início ou Hoje;
- Biblioteca ou Obras;
- Jornada;
- Ajustes.

O leitor é um estado iniciado a partir de uma obra ou da Home, não uma aba
permanente.

### Requisitos

- ícone e label;
- estado ativo perceptível;
- nome acessível;
- área de toque ampla;
- posição consistente.

## Dialog

### Missão

Apoiar decisões que exigem atenção sem gerar ansiedade.

### Requisitos

- título claro;
- consequência explícita;
- ação principal e alternativa;
- foco gerenciado;
- fechamento previsível;
- uso restrito a situações que realmente exigem interrupção.

## Processo para novos componentes

Um novo componente deve responder:

1. qual problema resolve;
2. por que um componente existente não é suficiente;
3. como reduz carga cognitiva;
4. como atende acessibilidade;
5. qual emoção deve transmitir;
6. como será testado.
