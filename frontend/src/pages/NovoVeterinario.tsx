import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarVeterinario } from '../api/veterinarios';

export function NovoVeterinario() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [crmv, setCrmv] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarVeterinario(nome, crmv || undefined);
      navigate(-1);
    } catch {
      setErro('Não foi possível cadastrar o veterinário.');
    }
  }

  return (
    <div>
      <header>
        <h1>Novo veterinário</h1>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="nome">Nome</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="crmv">CRMV (opcional)</label>
          <input id="crmv" value={crmv} onChange={(e) => setCrmv(e.target.value)} />
        </div>
        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}