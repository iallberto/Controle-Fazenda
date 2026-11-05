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
import { motivoSenhaFraca } from '../modulos/admin/senha-admin';
export { motivoSenhaFraca, senhaForte } from '../modulos/admin/senha-admin';

const TENTATIVAS = 3;

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
    // Na senha, mostra * no lugar de cada caractere digitado
    const interno = leitor as unknown as {
      _writeToOutput: (s: string) => void;
      getPrompt: () => string;
    };
    const original = interno._writeToOutput.bind(leitor);
    interno._writeToOutput = (s: string) => {
      if (!ocultando) return original(s);
      const prompt = interno.getPrompt();
      if (s.startsWith(prompt)) {
        original(prompt + '*'.repeat(s.length - prompt.length));
      } else {
        original(s.replace(/[^\r\n]/g, '*'));
      }
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
  const rl = obterLeitor();
  // O próprio readline desenha a pergunta; escrever direto no terminal faz o
  // texto sumir debaixo do "> " padrão dele
  if (fechado) {
    // Entrada por pipe já terminou: as respostas estão todas na fila
    process.stdout.write(texto);
  } else {
    rl.setPrompt(texto);
    rl.prompt();
  }
  ocultando = oculto;
  const resposta =
    fila.shift() ??
    (fechado
      ? ''
      : await new Promise<string>((resolve) => esperando.push(resolve)));
  ocultando = false;
  if (!process.stdin.isTTY) process.stdout.write('\n');
  return resposta.trim();
}

// Repete a pergunta até a resposta valer, com o motivo de cada recusa
async function perguntarAte(
  texto: string,
  validar: (resposta: string) => string | null,
  oculto = false,
) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const resposta = await perguntar(texto, oculto);
    const problema = validar(resposta);
    if (!problema) return resposta;
    console.log(`  ${problema}`);
    if (fechado && fila.length === 0) break;
  }
  throw new Error('Tentativas esgotadas. Nada foi alterado.');
}

async function principal() {
  await dataSource.initialize();
  const repositorio = dataSource.getRepository(Administrador);

  console.log('Criar ou redefinir o administrador do sistema\n');
  const email = (
    await perguntarAte('E-mail do administrador: ', (resposta) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(resposta)
        ? null
        : 'E-mail inválido. Exemplo: nome@dominio.com',
    )
  ).toLowerCase();
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
    : await perguntarAte('Nome do administrador: ', (resposta) =>
        resposta ? null : 'Informe o nome.',
      );

  console.log(
    'A senha precisa de 12 caracteres ou mais, com letras e números. Ela aparece como *.',
  );
  let senha = '';
  for (let tentativa = 1; ; tentativa++) {
    senha = await perguntarAte('Senha: ', motivoSenhaFraca, true);
    const repetida = await perguntar('Repita a senha: ', true);
    if (repetida === senha) break;
    console.log('  As senhas não conferem. Digite de novo.');
    if (tentativa >= TENTATIVAS || (fechado && fila.length === 0)) {
      throw new Error('Tentativas esgotadas. Nada foi alterado.');
    }
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  if (existente) {
    // Sessões abertas antes da redefinição deixam de valer (spec 007, FR-005)
    await repositorio.update({ id: existente.id }, { senhaHash, ativo: true, senhaAlteradaEm: new Date() });
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
