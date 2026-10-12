# Registro de decisões

## Premissas adotadas para o MVP

Estas escolhas completam pontos não especificados pelo responsável e podem ser revisadas.

| Decisão                                          | Motivo                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| Acesso por conta e associação à pelada           | Permite controlar dados pessoais e vários administradores           |
| Preparar isolamento de várias peladas            | Nome, tema, Pix e permissões pertencem ao grupo                     |
| Uma chave Pix ativa por pelada                   | Evita dúvida sobre o destinatário mesmo com vários administradores  |
| Comprovante enviado manualmente pelo WhatsApp    | Atende ao envio ao número do administrador sem integração ou upload |
| Goleiro incluído no tamanho do time              | Dois times de cinco continuam usando dez pessoas                    |
| Quantidade exata de participantes no sorteio     | Evita reservas ou pessoas excluídas silenciosamente                 |
| Sorteio aleatório sem avaliação de habilidade    | Corresponde ao pedido de aleatoriedade                              |
| Competência mensal sem rateio automático         | Não inventa distribuição de mensalidade entre partidas              |
| Despesas por partida                             | Permite calcular saldo real além das receitas                       |
| Detalhes financeiros individuais privados        | Usuário vê seus pagamentos e caixa agregado                         |
| Monólito modular com stack TypeScript/PostgreSQL | Reduz complexidade inicial e suporta transações                     |

## Confirmar antes de implementar funcionalidades dependentes

- Decisões de autenticação e criação inicial resolvidas em 12/10/2026, registradas abaixo.
- Se mensalidades deverão ser rateadas entre partidas no futuro e qual a regra explícita de rateio.
- Se haverá sorteio público sem conta, reservas, múltiplos times com tamanhos distintos ou balanceamento por habilidade.
- Se Pix por administrador individual deve substituir a configuração única por pelada.
- Se comprovantes deverão ser armazenados no aplicativo e por quanto tempo.
- Hospedagem, banco gerenciado e estratégia de backup antes da publicação.

Esses pontos não impedem criar componentes de domínio, protótipos ou testes das regras já definidas. Não habilitar fluxos dependentes sem resolver a decisão correspondente.

## Formato de novas decisões

### 2026-10-11 — Arquitetura e persistência

O responsável forneceu a regra Clean Architecture + Modular Monolith + SOLID. Ela substitui a recomendação anterior de Next.js para operações no servidor. Adotar NestJS no backend, React + TypeScript no frontend e PostgreSQL + Prisma. Não criar módulos de empresas nem CNPJ de empresa: são exemplos do arquivo original.

Um único banco e schema `public` atendem ao MVP; módulos possuem suas tabelas e acessam outros módulos por contratos. Chaves estrangeiras compostas reforçam o isolamento por pelada. Checks e índices parciais necessários serão mantidos em migrations SQL, sem transferir acesso SQL para os casos de uso.

O arquivo `.ai/database/schema.sql` é um blueprint físico, não uma migration aplicada nem um backend pronto. Um banco real e a versão de Prisma ainda precisam ser definidos para gerar e validar as migrations de implementação.

### 2026-10-11 — Chore frontend/backend

Adotar npm workspaces (`frontend` e `backend`) com lockfile único e Node.js 24. Versões estáveis consultadas: React 19.3.0, Vite 8.3.4, NestJS 12.1.2, PostgreSQL 18.6 e Prisma 7.10.0. O Prisma publicado no canal latest apontava para RC 8; selecionada a linha 7 estável. TypeScript 6.0.3 foi escolhido pela compatibilidade com CLI NestJS e typescript-eslint, sem forçar peer dependencies.

O modelo Prisma e a migration inicial substituem o blueprint como fonte do banco aplicado. Checks e índices parciais ficam no SQL versionado. PGlite permite testar integridade sem Docker local; CI usa PostgreSQL 18 para aplicar migrations e testar o Prisma com backend compilado.

O módulo health demonstra as camadas: uma porta permite trocar a sonda de banco por fake nos testes; um caso de uso sem NestJS/Prisma coordena a disponibilidade; Infrastructure executa a consulta e Presentation traduz indisponibilidade em HTTP 503. Nenhum repositório genérico, CRUD de negócio ou mecanismo de autenticação foi inventado.

Compose contém apenas PostgreSQL no chore; Node.js executa web e API localmente. Containers de aplicação e estratégia de publicação serão definidos quando solicitados.

NestJS 12 usa ESM: backend e cliente Prisma são gerados em ESM com resolução NodeNext e extensões `.js` nos imports locais. Overrides restritos ao tooling Prisma usam deepmerge-ts 8.0.2 e mysql2 3.24.5 para corrigir os avisos da auditoria; não executar `npm audit fix --force` indiscriminadamente.

Testes locais de controllers/casos de uso não abrem portas, pois a conexão HTTP local foi bloqueada pelo sandbox e a execução fora dele foi recusada. O workflow inclui smoke HTTP com o backend compilado e PostgreSQL real.

### 2026-10-11 — Ambiente completo de desenvolvimento em Docker

Por solicitação do responsável, o Compose passa a incluir PostgreSQL, migrations, backend e frontend. Um Dockerfile de desenvolvimento compartilhado aproveita o monorepo npm e o lockfile único. A aplicação de migrations é um serviço temporário que precisa terminar com sucesso antes do backend; o frontend depende do readiness do backend.

Bind mounts permitem editar o código no host. Polling suporta alterações de arquivos no Docker Desktop/Windows. Node_modules não é montado do host, e o cliente Prisma gerado fica em volume separado. PostgreSQL usa volume persistente e as portas publicadas são limitadas a 127.0.0.1. O container do frontend consome exclusivamente a API via proxy; não recebe credenciais de banco.

As tabelas e colunas já definidas são materializadas pela migration inicial, sem criar nova migration redundante. Não cadastrar dados de negócio fictícios no banco principal nem alterar o fluxo de autenticação para atender à execução em Docker.

Registrar data, contexto, decisão, motivo e consequências. Marcar decisões substituídas sem apagar o histórico. Atualizar os demais documentos afetados na mesma alteração.

### 2026-10-12 — MVP completo e autenticação com convites

O responsável escolheu e-mail/senha no próprio backend, com convites, solicitou Swagger e autorizou concluir o backend e depois o frontend, adotando as sugestões reversíveis necessárias. Usar Better Auth 1.7.7 na Infrastructure, sem expor seu handler genérico. Registro cria conta/sessão; criar pelada cria o primeiro administrador atomicamente. Convites ligam e-mail, papel e pelada, expiram em 1–30 dias (padrão 7), têm uso único e revogação. Só SHA-256 do token aleatório fica no banco; compartilhar é manual, sem serviço de e-mail.

Sessões são opacas, revogáveis e expiram em sete dias. Frontend usa sessionStorage e limpa token ao sair ou receber 401. Troca de senha autenticada revoga as demais sessões. Recuperação de senha e verificação por e-mail exigem futura integração e não fazem parte do MVP solicitado.

Módulos preservam as camadas obrigatórias. Uma UnitOfWork com portas específicas permite atomicidade entre financeiro, membros, Pix e auditoria. Bloqueio da linha da pelada serializa operações sensíveis, incluindo remoção concorrente do último administrador. Correções possuem referência `replacesId`, permitindo reenvio idempotente com preservação do histórico. Migration aditiva mantém dados e constraints originais.

Swagger em `/api/docs` e `/api/docs-json`, ativo no desenvolvimento e desligado por padrão em produção, documenta Bearer opaco e contratos. Limites: listas até 100/página; sorteio até 50 times, 50 pessoas/time e 500 entradas; lançamentos positivos até 2.147.483.647 centavos, somas verificadas como inteiros seguros. Esses limites são operacionais, sem alterar valores livres ou gerar cobranças.

Frontend React Router com CSS por pelada, telas em português, estados de erro/vazio e formulários responsivos. Não criar dados fictícios no banco principal. Chave Pix validada por formato (incluindo CNPJ alfanumérico), sem validar titularidade ou confirmação bancária. WhatsApp apenas abre a conversa para anexo manual. Segredo local gerado por `scripts/setup-dev-env.mjs`, ignorado pelo Git.

Testes unitários/fakes, constraints PGlite e integração HTTP em PostgreSQL real isolado validam permissões, caixa, idempotência, concorrência, sessões, convites e Swagger. Testes de interface validam contratos do sorteio/convite e reenvio financeiro. Hospedagem continua uma decisão para futura publicação; não provisionar serviços externos nesta entrega local.

### 2026-10-12 — Check-in compartilhado, campos numerados e logo

O responsável solicitou link único por partida para toda a turma confirmar presença pelo nome, explicitamente sem destinatário, e-mail ou cadastro. Este fluxo público específico é independente dos convites de acesso administrativo e não concede acesso à pelada. Administrador confirma partida agendada e informa campo/endereço; modal público pede apenas nome e mostra a confirmação com o local.

Guardar somente SHA-256 do token aleatório de 256 bits; compartilhar manualmente a URL `/attendance#token`. O segredo aparece na geração e não fica nos caminhos HTTP; APIs públicas recebem token no corpo, sem cache. Por escolha reversível, expira 24 horas após o horário da partida. Uma linha por partida: nova geração renova validade e invalida a URL anterior; revogação ou encerramento da partida bloqueia confirmações. Atualizar a data depois de gerar não estende a validade automaticamente: gerar novo link quando necessário.

Normalizar nomes por NFC e espaços, comparando sem diferenciar maiúsculas dentro da mesma pelada. Reutilizar um único participante ativo, recusando ambiguidades de homônimos. Nome novo cria diarista sem conta, modalidade ajustável pelo admin; não inventar preço, conta ou membership. Bloquear a pelada e revalidar o token dentro da transação para evitar duplicações e aceitar revogações concorrentes. Auditoria de ações públicas usa autor nulo e apenas referências. Check-in representa nome declarado pela pessoa, sem verificação de identidade. Exibir apenas dados mínimos da partida, sem listas ou dados financeiros.

O sorteio cria automaticamente `times × pessoas por time` inputs de nome numerados, incluindo goleiros no total. Slots preservam nomes ao reduzir e restaurar o tamanho; só o total atual participa do sorteio. Não há lista de reservas implícita. Mantêm-se as mesmas permissões e contratos REST.

Logo PNG original fornecida pelo responsável fica em `frontend/public/brand`. O componente Brand usa recortes SVG do símbolo e da palavra, mantendo o arquivo original. O favicon SVG contém o mesmo PNG recortado ao símbolo; é regenerado por `node scripts/generate-brand-assets.mjs`. A palavra recebe versão clara por CSS nos fundos escuros, preservando forma e símbolo azul.
