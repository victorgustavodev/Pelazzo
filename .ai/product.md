# Produto

## Objetivo

Oferecer um site para organizar uma pelada, acompanhar participantes e o caixa de cada partida, divulgar dados para pagamento por Pix e sortear times aleatórios.

O nome inicial é Pelazzo. Cada pelada pode usar seu próprio nome, como “Pelada dos irresponsáveis”, e sua cor de tema.

## Requisitos solicitados

- Participantes mensalistas e diaristas.
- Valores livres: administradores gerenciam quem pagou e quanto pagou.
- Caixa por partida.
- Sorteio acessível a usuários e administradores.
- Entrada de quantidade de times, pessoas por time, presença de goleiros e nomes.
- Exemplo: dois times de cinco pessoas usam dez participantes, distribuídos aleatoriamente.
- Chave Pix configurada por administrador e envio de comprovante ao número do administrador.
- Suporte a mais de um administrador.
- Nome e cor do aplicativo configuráveis no painel administrativo.

## Perfis

**Usuário:** consulta informações da pelada, seus pagamentos, instruções de Pix e executa sorteios.

**Administrador:** também gerencia partidas, participantes, pagamentos, gastos, administradores, dados de Pix e personalização.

Participante e conta de acesso são conceitos diferentes: o administrador pode cadastrar alguém que ainda não possui conta.

## Jornadas do MVP

1. Administrador cria/configura a pelada, informa nome, tema, chave Pix e contato que receberá comprovantes.
2. Administrador cadastra participantes como mensalistas ou diaristas e cria uma partida.
3. Administrador associa participantes à partida e, se desejar, registra um valor esperado individual.
4. Usuário consulta os dados de Pix, copia a chave e abre o contato para enviar o comprovante.
5. Administrador confere o recebimento e registra valor, participante e referência da partida.
6. Usuário ou administrador informa os parâmetros e nomes, executa o sorteio e visualiza os times.

## Fora do MVP

Integração bancária, validação automática de Pix, assinatura recorrente, cobrança automática, classificação por habilidade, reservas de quadra, campeonatos e notificações automáticas. Não há promessa de equilíbrio técnico no sorteio aleatório.
