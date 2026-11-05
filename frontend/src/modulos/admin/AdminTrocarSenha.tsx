import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { administradorLogado, trocarSenhaDoPainel } from './api';

// Troca da senha do administrador (spec 007, FR-002): 12 caracteres ou mais,
// com letras e números, a mesma regra do comando criar-admin
export function AdminTrocarSenha() {
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    document.title = 'Trocar senha · Painel do administrador';
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    if (novaSenha !== repetida) {
      setErro('As duas senhas novas não conferem.');
      return;
    }
    setSalvando(true);
    try {
      await trocarSenhaDoPainel(senhaAtual, novaSenha);
      navigate('/admin', { state: { aviso: 'Senha do painel trocada.' } });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível trocar a senha.'));
      setSalvando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>Trocar minha senha</h1>
        <Link to="/admin">Todas as fazendas</Link>
      </header>
      <form onSubmit={salvar}>
        <input type="email" name="username" autoComplete="username" value={administradorLogado()?.email ?? ''} readOnly hidden />
        <div>
          <label htmlFor="admin-senha-atual">Senha atual</label>
          <input
            id="admin-senha-atual"
            name="senha-atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="admin-nova-senha">Senha nova (12 caracteres ou mais, com letras e números)</label>
          <input
            id="admin-nova-senha"
            name="nova-senha"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="admin-repetir-senha">Repita a senha nova</label>
          <input
            id="admin-repetir-senha"
            name="repetir-senha"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
          />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar senha nova'}
        </button>
      </form>
    </div>
  );
}
