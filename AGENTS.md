# Orientações para agentes de IA

Antes de implementar ou alterar este projeto, leia:

- `.ai/architecture-rule.md` — regra arquitetural fornecida pelo responsável, obrigatória.
- `.ai/database/README.md` — arquitetura física e contratos de persistência.

1. `.ai/README.md`
2. `.ai/product.md`
3. `.ai/business-rules.md`
4. `.ai/architecture.md`
5. `.ai/data-model.md`
6. `.ai/acceptance-criteria.md`

Esses documentos são a referência de produto e arquitetura. Instruções explícitas do responsável pelo projeto têm prioridade. Quando uma nova decisão mudar o comportamento documentado, atualize a documentação junto com a implementação.

- Não invente cobrança fixa, confirmação automática de Pix ou permissões adicionais.
- Aplique autorização no servidor; esconder botões não protege operações.
- Mantenha valores financeiros em centavos e evite números de ponto flutuante.
- Não exponha segredos, dados financeiros privados ou comprovantes em logs.
- Preserve mudanças existentes do usuário e limite alterações ao escopo solicitado.
- Valide regras críticas com testes: permissões, caixa, isolamento entre peladas e sorteio.
- Não implemente itens futuros como parte do MVP sem solicitação.
- Backend: NestJS, Clean Architecture, Modular Monolith e SOLID pragmático. Frontend: React + TypeScript consumindo exclusivamente a API REST.
- Domain e Application não importam Prisma, SQL, NestJS ou infraestrutura. Contratos de repositório ficam no Domain; implementações Prisma na Infrastructure; DTOs HTTP na Presentation.
- Os exemplos `companies`, CNPJ e notificações do arquivo original são exemplos de outro domínio: não criar essas funcionalidades para a pelada.
- Se uma decisão essencial estiver indefinida, faça uma pergunta objetiva. Para escolhas reversíveis, use a recomendação documentada e registre a decisão.
