import { createInterface } from 'node:readline';
import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';
import { Administrador } from '../modulos/admin/entities/administrador.entity';

// Cria (ou redefine a senha de) o administrador do sistema (spec 002, FR-022).
// Não há tela pública de cadastro: só este comando, rodado no servidor.
//
//   docker compose exec backend npm run admin:criar
//   (fora do Docker: npm run build && npm run admin:criar)

// Mínimo de 12 caracteres, com letras e números (FR-018a)
export function senhaForte(senha: string) {
  return senha.length >= 12 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

// Uma interface só, com fila de linhas: funciona digitando no terminal e
// também com as respostas vindas de um pipe (linhas que chegam antes da
// pergunta ficam guardadas).
let leitor: ReturnType<typeof createInterface> | null = null;
let ocultando = false;
let fechado = false;
const fila: string[] = [];
const esperando: ((linha: string) => void)[] = [];

function obterLeitor() {
  if (!leitor) {
    leitor = createInterface({ input: process.stdin, output: process.stdout });
    // Não mostra a senha enquanto ela é digitada
    const interno = leitor as unknown as {
      _writeToOutput: (s: string) => void;
    };
    const original = interno._writeToOutput.bind(leitor);
    interno._writeToOutput = (s: string) => {
      if (!ocultando) original(s);
    };
    leitor.on('line', (linha) => {
      const proximo = esperando.shift();
      if (proximo) proximo(linha);
      else fila.push(linha);
    });
    leitor.on('close', () => {
      fechado = true;
      esperando.splice(0).forEach((resolver) => resolver(''));
    });
  }
  return leitor;
}

async function perguntar(texto: string, oculto = false): Promise<string> {
  obterLeitor();
  process.stdout.write(texto);
  ocultando = oculto;
  const resposta =
    fila.shift() ??
    (fechado
      ? ''
      : await new Promise<string>((resolve) => esperando.push(resolve)));
  ocultando = false;
  if (oculto) process.stdout.write('\n');
  return resposta.trim();
}

async function principal() {
  await dataSource.initialize();
  const repositorio = dataSource.getRepository(Administrador);

  const email = (await perguntar('E-mail do administrador: ')).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('E-mail inválido');
  }
  const existente = await repositorio.findOneBy({ email });
  if (existente) {
    const confirma = await perguntar(
      `Já existe o administrador ${existente.nome}. Redefinir a senha? (s/N) `,
    );
    if (confirma.toLowerCase() !== 's') {
      console.log('Nada foi alterado.');
      return;
    }
  }
  const nome = existente
    ? existente.nome
    : await perguntar('Nome do administrador: ');
  if (!nome) throw new Error('Informe o nome');

  const senha = await perguntar(
    'Senha (mínimo 12, com letras e números): ',
    true,
  );
  if (!senhaForte(senha)) {
    throw new Error(
      'Senha fraca: use 12 caracteres ou mais, com letras e números',
    );
  }
  if ((await perguntar('Repita a senha: ', true)) !== senha) {
    throw new Error('As senhas não conferem');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  if (existente) {
    await repositorio.update({ id: existente.id }, { senhaHash, ativo: true });
    console.log(`Senha do administrador ${email} redefinida.`);
  } else {
    await repositorio.insert({ nome, email, senhaHash, ativo: true });
    console.log(`Administrador ${email} criado.`);
  }
}

if (require.main === module) {
  principal()
    .catch((erro: Error) => {
      console.error(`Erro: ${erro.message}`);
      process.exitCode = 1;
    })
    .finally(() => {
      leitor?.close();
      if (dataSource.isInitialized) void dataSource.destroy();
    });
}
