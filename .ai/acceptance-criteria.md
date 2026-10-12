# Critérios de aceite

## Administração

- Cadastro por e-mail/senha cria sessão; logout revoga imediatamente e troca de senha revoga outras sessões.
- Criar pelada cria seu primeiro administrador atomicamente.
- Convite só é aceito pela conta do e-mail convidado, antes da expiração, sem revogação e uma única vez. O token só aparece na criação.

- Com dois administradores, ambos conseguem gerenciar partidas, valores e tema da mesma pelada.
- Um usuário comum tentando alterar pagamento ou configuração diretamente pelo endpoint recebe negação e não altera dados.
- Remover ou rebaixar o último administrador é bloqueado, inclusive em requisições concorrentes.
- Um membro da pelada A não acessa informações da pelada B ao trocar identificadores.

## Financeiro

- Sem valor esperado, registrar R$ 27,50 mostra o valor recebido sem inventar saldo devedor.
- Com esperado de R$ 40,00 e recebimentos de R$ 15,00 e R$ 25,00, total pago é R$ 40,00 e estado é quitado.
- Com esperado de R$ 40,00 e recebido de R$ 45,00, mostrar excedente de R$ 5,00 sem criar crédito automaticamente.
- Receitas de R$ 200,00 e despesas de R$ 150,00 produzem saldo de R$ 50,00.
- Anular um recebimento o retira dos totais e preserva motivo, autor e histórico.
- Reenviar uma operação com a mesma chave de idempotência não duplica receitas.
- Recebimento mensal sem partida não altera caixa de nenhuma partida.
- Usuário consulta seus detalhes financeiros e totais do caixa, sem acessar detalhes de outros participantes.

## Sorteio

- Dois times de cinco pessoas, sem goleiros, com dez entradas produzem dois grupos de cinco, sem omissão ou repetição de entrada.
- Dois times de cinco, com dois goleiros e oito jogadores de linha, produzem dois grupos de cinco com exatamente um goleiro em cada.
- Nove ou onze entradas para dois times de cinco bloqueiam o sorteio com mensagem clara.
- Goleiros em número diferente da quantidade de times bloqueiam o sorteio.
- Usuário e administrador conseguem sortear com as mesmas regras.
- Homônimos com identificações distintas podem participar; entrada vazia é rejeitada.
- Realizar novo sorteio não altera pagamentos nem presença.

## Pix e tema

- Chave e favorecido configurados aparecem para os membros e a ação copiar usa a chave correta.
- A ação de comprovante abre a conversa do contato configurado; o usuário anexa e envia manualmente.
- Abrir o contato não cria nem confirma um pagamento.
- Trocar nome e cor atualiza a interface da pelada e preserva legibilidade.
- Configuração de uma pelada não altera tema ou Pix de outra.

## Interface e contrato

- As telas consomem exclusivamente a API REST e possuem estados de carregamento, vazio e erro.
- Admin gerencia participantes, agenda/presenças, caixa e membros; USER consulta próprios dados financeiros, caixa agregado, Pix e sorteia.
- Reenvio de formulário financeiro após falha de conexão preserva a chave de idempotência.
- R$ 27,50 é enviado como 2750 centavos; formatos ambíguos e frações de centavo são rejeitados.
- Formulários possuem labels associados e descrições, dialogs com foco/teclado, navegação móvel e tema com contraste de texto.
- Swagger documenta rotas, DTOs e Bearer, incluindo os nomes `ttlDays` e `hasGoalkeepers`.
