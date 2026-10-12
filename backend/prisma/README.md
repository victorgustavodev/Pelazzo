# Persistência

`schema.prisma` mapeia o modelo documentado em `.ai/database`. A migration inicial preserva checks e índices parciais definidos no SQL de referência. `@default(uuid())` gera IDs pelo Prisma; inserções SQL diretas precisam fornecer UUIDs. Datas `updatedAt` são mantidas pelo ORM.

Execute os comandos da raiz:

```sh
npm run db:generate
npm run db:validate
npm run db:deploy
```

Para novas alterações, execute `npm run db:migrate --workspace @pelazzo/backend -- --name <nome>`. Revise o SQL antes de aplicar, preservando checks e índices parciais. Não usar `db push` como migration.

As credenciais locais de exemplo estão em `backend/.env.example`; copie para `backend/.env`. O cliente gerado é ignorado pelo Git e recriado por build/typecheck/test. Domain e Application não podem importar modelos Prisma, PrismaService ou SQL.
