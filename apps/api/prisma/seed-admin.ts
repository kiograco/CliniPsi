import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const PASSWORD_SALT_ROUNDS = 12;

loadRootEnv();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_SEED !== 'true') {
    throw new Error('Seed de admin bloqueado em producao.');
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador DivulgaPsi';

  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o admin inicial.');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const user = await prisma.user.upsert({
    where: {
      email
    },
    create: {
      name,
      email,
      passwordHash: await hash(password, PASSWORD_SALT_ROUNDS),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    update: {
      name,
      passwordHash: await hash(password, PASSWORD_SALT_ROUNDS),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    select: {
      email: true,
      role: true,
      status: true
    }
  });

  console.log(`Admin local pronto: ${user.email} (${user.role}, ${user.status})`);
}

function loadRootEnv() {
  const rootEnvPath = join(__dirname, '..', '..', '..', '.env');

  if (!existsSync(rootEnvPath)) {
    return;
  }

  const content = readFileSync(rootEnvPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
