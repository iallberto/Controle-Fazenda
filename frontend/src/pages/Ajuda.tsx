import { useEffect, useState } from 'react';
import { buscarAcesso, linkWhatsapp } from '../api/acesso';

const WHATSAPP_PADRAO = '5535984776552';

// Ajuda (spec 008, US4): contato com o suporte pelo WhatsApp. Os tutoriais
// (passo a passo com capturas de tela e vídeo curto do canal da empresa)
// entram aqui numa versão futura.
export function Ajuda() {
  const [whatsapp, setWhatsapp] = useState(WHATSAPP_PADRAO);
  const [fazenda, setFazenda] = useState('');

  useEffect(() => {
    buscarAcesso()
      .then((a) => {
        setWhatsapp(a.whatsappSuporte || WHATSAPP_PADRAO);
        setFazenda(a.fazendaNome);
      })
      .catch(() => undefined);
  }, []);

  const mensagem = `Olá, sou da ${fazenda || 'minha fazenda'} e preciso de ajuda com o Controle Fazenda.`;

  return (
    <div>
      <header>
        <h1>Ajuda</h1>
      </header>
      <section>
        <h2>Fale com o suporte</h2>
        <p>Dúvida no cadastro, no manejo ou em qualquer tela? Chame a gente no WhatsApp.</p>
        <a className="botao botao-whatsapp" href={linkWhatsapp(whatsapp, mensagem)} target="_blank" rel="noreferrer">
          Falar com o suporte no WhatsApp
        </a>
      </section>
    </div>
  );
}
