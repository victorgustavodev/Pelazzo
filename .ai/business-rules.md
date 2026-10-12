# Regras de negócio

## Peladas e permissões

- Toda informação pertence a uma pelada. Uma conta pode participar de mais de uma, com papéis distintos.
- Membros autenticados acessam a pelada. A exceção pública é o check-in pelo link aberto por um administrador, limitado aos dados da partida e à confirmação pelo nome. “Qualquer pessoa” no sorteio significa qualquer usuário ou administrador autorizado da pelada.
- Uma pelada deve ter pelo menos um administrador ativo. É proibido remover ou rebaixar o último administrador.
- Administradores podem promover e rebaixar membros da própria pelada. Operações são auditadas.
- Usuários não podem registrar, confirmar, corrigir ou excluir pagamentos nem alterar configurações.
- Acesso local por e-mail/senha. Qualquer conta autenticada pode criar uma pelada, tornando-se seu primeiro administrador em transação.
- Entrada em pelada existente é por convite vinculado ao e-mail da conta, com papel USER ou ADMIN escolhido pelo administrador. Convites expiram, podem ser revogados e têm uso único. Uma conta desativada pode retornar por novo convite válido.
- Não há envio de e-mail automático nem recuperação por e-mail no MVP. O usuário pode trocar a senha autenticado; a operação encerra suas outras sessões.

## Participantes e partidas

- Cada participante tem nome e modalidade: `MONTHLY` (mensalista) ou `DAILY` (diarista).
- Modalidade não define preço, vencimento nem desconto automaticamente.
- Uma partida possui título, data/hora, local opcional e estado `SCHEDULED`, `FINISHED` ou `CANCELED`.
- Um participante só pode aparecer uma vez na lista de presença da mesma partida.
- Cancelar uma partida não apaga seu histórico financeiro.
- Alterar a modalidade do participante não altera registros históricos da partida.

## Check-in por link compartilhado

- Ao confirmar que haverá uma partida agendada, o administrador informa o campo/endereço e gera um único link para toda a turma. Não escolher destinatários nem exigir e-mail, conta ou senha nesse fluxo.
- O link abre um modal com apenas o nome. A confirmação exibe “Presença confirmada!”, o nome e “te aguardo em:” com campo/endereço e data.
- O link vale até 24 horas após o horário da partida. Pode ser encerrado pelo administrador; gerar outro invalida o anterior. Partidas finalizadas/canceladas não aceitam check-in.
- Token aleatório de 256 bits, guardado somente por hash. Aparece apenas na geração; o administrador copia e compartilha o mesmo link com todos. Não enviar mensagens automaticamente.
- Reutilizar um único participante ativo da mesma pelada com o mesmo nome normalizado (Unicode NFC, espaços e comparação sem diferenciar maiúsculas). Reenvio, inclusive concorrente, não duplica presença. Para homônimos ambíguos, solicitar sobrenome ou apelido distintivo.
- Nome novo cria participante DAILY, ativo e sem conta vinculada; o administrador pode ajustar a modalidade posteriormente. Participante existente preserva modalidade, conta e histórico. Check-in não cria membership, pagamento, valor esperado ou dívida.
- Auditar confirmação pública com autor nulo, identificado como “Pelo link da partida”; não atribuir a ação a um administrador. Registrar apenas referências, sem nomes ou tokens nos metadados.
- A resposta pública contém apenas nome da pelada, cor, fuso, título, data e local da partida, mais o nome confirmado na resposta individual. Não expor lista de pessoas, contas, telefone, Pix, caixa ou detalhes financeiros.

## Pagamentos e caixa

- Não existe valor obrigatório fixo ou global. O administrador informa quanto cada pessoa efetivamente pagou.
- Valor esperado é opcional, por participante e partida. Sem ele, não calcular dívida nem classificar como inadimplente.
- Cada recebimento tem valor positivo, moeda BRL, participante, data do recebimento, administrador responsável e estado `CONFIRMED` ou `VOIDED`.
- Pagamentos parciais e múltiplos recebimentos são permitidos. Total pago é a soma dos recebimentos confirmados daquela participação.
- Com valor esperado definido: total zero significa pendente; total abaixo do esperado significa parcial; total igual ou superior significa quitado. Excedente deve ser mostrado, sem gerar crédito automático.
- Sem valor esperado: mostrar “Sem recebimento registrado” ou “Recebido R$ X”, sem presumir dívida.
- Somente pagamentos confirmados e vinculados à partida entram nas receitas do caixa da partida.
- O caixa mostra receitas, despesas confirmadas e saldo = receitas − despesas. Saldo negativo é permitido.
- Administradores podem registrar despesas com descrição e valor positivo. Despesas são uma premissa do MVP para tornar o saldo útil.
- Um recebimento mensal pode ficar associado a uma competência `AAAA-MM`, sem partida. Nesse caso, aparece no financeiro geral, mas não entra automaticamente em nenhum caixa de partida.
- No MVP, cada recebimento pertence a uma única referência: uma partida ou uma competência mensal. Não duplicar um mesmo recebimento em várias partidas.
- Correções financeiras anulam o lançamento anterior com motivo e criam um novo quando necessário. Não excluir definitivamente nem sobrescrever o histórico.
- Impedir registro duplicado por reenvio da mesma operação com chave de idempotência.

## Pix e comprovantes

- A pelada tem uma configuração ativa de Pix: administrador destinatário, chave, tipo de chave, nome do favorecido e número de contato.
- Pode haver vários administradores, mas uma única chave ativa exibida por pelada no MVP, evitando ambiguidade no pagamento.
- Validar os tipos CPF, CNPJ, e-mail, telefone e chave aleatória conforme o formato; validação de formato não comprova titularidade.
- Exibir favorecido e chave e permitir copiar. Não cobrar valor fixo nem informar que o pagamento foi concluído apenas por abrir o link.
- Premissa: envio de comprovante pelo WhatsApp do administrador, com telefone normalizado e código do país. O usuário abre a conversa e anexa/envia o arquivo manualmente.
- Abrir o WhatsApp não confirma envio nem recebimento do comprovante. A aplicação não anexa arquivos automaticamente.
- O administrador confirma o pagamento após conferir o recebimento. Comprovante sozinho não confirma pagamento.
- Alterar chave ou destinatário não altera o histórico dos recebimentos.
- Upload e armazenamento de comprovantes dentro do aplicativo ficam fora do MVP.

## Sorteio

- Usuários e administradores têm as mesmas permissões para executar sorteios.
- Solicitar quantidade de times, quantidade de pessoas por time, uso de goleiros e lista de nomes.
- Quantidade de times deve ser inteira e pelo menos dois; pessoas por time deve ser inteira positiva.
- Total de nomes deve ser exatamente `quantidade de times × pessoas por time`. Bloquear excesso ou falta e explicar o ajuste necessário.
- A interface cria exatamente esse total de campos de nome, numerados desde 1, e mostra a multiplicação. Reduzir e depois aumentar o total preserva os nomes digitados; campos vazios bloqueiam o sorteio.
- Goleiro conta como uma das pessoas do time. Se houver goleiros, exigir exatamente um goleiro identificado por time.
- Com goleiros, sortear os goleiros entre os times e distribuir os jogadores de linha aleatoriamente nas vagas restantes.
- Sem goleiros, embaralhar a lista inteira e distribuir em grupos do tamanho solicitado.
- Cada entrada tem identificador único; ninguém aparece em dois times nem fica de fora.
- Remover espaços externos e rejeitar nomes vazios. Nomes iguais são permitidos para homônimos, mas exigir apelido ou identificação que os diferencie na exibição.
- Usar Fisher–Yates com fonte de aleatoriedade adequada. Não usar ordenação com comparador aleatório.
- Novo sorteio pode repetir uma distribuição anterior. Não prometer uma combinação inédita.
- Um sorteio não altera presença, pagamentos ou configurações da partida.

## Personalização e privacidade

- Apenas administradores alteram o nome e a cor principal da pelada.
- Nome deve ter de 2 a 80 caracteres após remoção de espaços externos. Tratar como texto, nunca como HTML.
- Cor deve ser hexadecimal `#RRGGBB`; derivar cores de texto com contraste legível e manter foco e estados de erro visíveis.
- Usuários veem totais do caixa e seus próprios detalhes de pagamento. Administradores veem os detalhes financeiros dos participantes.
- Não publicar telefone, chave Pix, dados pessoais ou financeiro fora do acesso autorizado da pelada.
