import { Link } from 'react-router-dom';
import { ScanLine, MessageCircle, ShieldCheck } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api } from '../services/api';
import type { Pix } from '../types/api';
import {
  PageHeading,
  Loading,
  ErrorBox,
  Empty,
  CopyButton,
  Notice,
} from '../components/ui';
export function PixPage() {
  const { group, admin, revision } = useGroup();
  const resource = useResource(
    (s) =>
      api<{ settings: Pix | null }>(`/groups/${group.id}/pix`, {
        signal: s,
      }).then((value) => value.settings),
    [group.id, revision],
  );
  return (
    <>
      <PageHeading
        title="Pix da pelada"
        description="Copie a chave, confira o favorecido e envie o comprovante ao admin."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} retry={resource.reload} />
      ) : resource.data ? (
        <div className="pix-layout">
          <section className="card pix-card">
            <div className="pix-icon">
              <ScanLine size={36} />
            </div>
            <p className="eyebrow">DADOS PARA PAGAMENTO</p>
            <h2>{resource.data.recipientName}</h2>
            <p className="muted">Favorecido da chave configurada</p>
            <div className="pix-key">
              <span>
                Chave{' '}
                {
                  {
                    EMAIL: 'e-mail',
                    CPF: 'CPF',
                    CNPJ: 'CNPJ',
                    PHONE: 'telefone',
                    RANDOM: 'aleatória',
                  }[resource.data.keyType]
                }
              </span>
              <code>{resource.data.keyValue}</code>
              <CopyButton
                value={resource.data.keyValue}
                label="Copiar chave Pix"
              />
            </div>
            <p className="muted fine">
              O valor é combinado com o administrador. A pelada não tem cobrança
              fixa.
            </p>
          </section>
          <section className="card">
            <h2>Depois de pagar</h2>
            <ol className="steps">
              <li>
                <span>1</span>
                <div>
                  <strong>Faça o Pix no seu banco</strong>
                  <p className="muted">
                    Confira a chave e o nome do favorecido antes de confirmar.
                  </p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Envie o comprovante</strong>
                  <p className="muted">
                    Abra a conversa e anexe o arquivo manualmente.
                  </p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Aguarde a conferência</strong>
                  <p className="muted">
                    O administrador registra o recebimento após conferir.
                  </p>
                </div>
              </li>
            </ol>
            <a
              className="button primary full"
              href={
                resource.data.receiptUrl ??
                `https://wa.me/${resource.data.contactPhone.replace(/\D/g, '')}`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={19} /> Abrir WhatsApp do admin
            </a>
            <Notice>
              <ShieldCheck size={20} /> Abrir a conversa não confirma pagamento
              nem envio do comprovante.
            </Notice>
          </section>
        </div>
      ) : (
        <Empty
          title="O Pix ainda não foi configurado"
          action={
            admin && (
              <Link className="button primary" to={`/g/${group.id}/settings`}>
                Configurar Pix
              </Link>
            )
          }
        >
          O administrador pode cadastrar a chave e o contato no painel da
          pelada.
        </Empty>
      )}
    </>
  );
}
