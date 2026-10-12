import { text, choice } from '../../../../shared/domain/validation.js';
import { invalid } from '../../../../shared/domain/errors.js';
export type Role = 'USER' | 'ADMIN';
export interface Group {
  id: string;
  name: string;
  primaryColor: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface Member {
  id: string;
  groupId: string;
  userId: string;
  role: Role;
  active: boolean;
  displayName: string;
}
export interface Invitation {
  id: string;
  groupId: string;
  email: string;
  role: Role;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  revokedAt: Date | null;
  createdAt: Date;
}
export interface Pix {
  groupId: string;
  recipientAdminUserId: string;
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  keyValue: string;
  recipientName: string;
  contactPhone: string;
}
export function groupData(input: {
  name: string;
  primaryColor?: string;
  timezone?: string;
}) {
  const name = text(input.name, 'Nome da pelada', 2, 80);
  const primaryColor = input.primaryColor ?? '#15803D';
  if (!/^#[0-9a-f]{6}$/i.test(primaryColor)) invalid('Cor deve usar #RRGGBB.');
  const timezone = input.timezone ?? 'America/Sao_Paulo';
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone });
  } catch {
    invalid('Fuso horário inválido.');
  }
  return { name, primaryColor, timezone };
}
export function role(value: unknown): Role {
  return choice(value, ['USER', 'ADMIN'], 'Perfil');
}
export function pixData(input: Omit<Pix, 'groupId'>): Omit<Pix, 'groupId'> {
  const keyType = choice(
    input.keyType,
    ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] as const,
    'Tipo de chave',
  );
  let keyValue = text(input.keyValue, 'Chave Pix', 1, 255);
  if (keyType === 'CPF' || keyType === 'CNPJ')
    keyValue = keyValue.replace(/[.\-/]/g, '').toUpperCase();
  if (keyType === 'EMAIL') keyValue = keyValue.toLowerCase();
  if (keyType === 'PHONE') keyValue = keyValue.replace(/[\s()-]/g, '');
  const patterns = {
    CPF: /^\d{11}$/,
    CNPJ: /^[A-Z0-9]{12}\d{2}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+[1-9]\d{7,14}$/,
    RANDOM: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  };
  if (
    !patterns[keyType].test(keyValue) ||
    (keyType === 'EMAIL' && keyValue.length > 77)
  )
    invalid('Formato da chave Pix inválido.');
  const contactPhone = text(input.contactPhone, 'Contato', 8, 32).replace(
    /[\s()-]/g,
    '',
  );
  if (!patterns.PHONE.test(contactPhone))
    invalid('Contato deve incluir + e código do país.');
  return {
    ...input,
    keyType,
    keyValue,
    recipientName: text(input.recipientName, 'Favorecido'),
    contactPhone,
  };
}
