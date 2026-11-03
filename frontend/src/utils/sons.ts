// Sons de confirmação (M14), gerados com a Web Audio API: não há arquivo de áudio
// para baixar e funcionam offline. Cada som é uma sequência de notas curtas.

export type NomeSom = 'SINO' | 'BIPE' | 'DUPLO';

export const ROTULOS_SOM: Record<NomeSom, string> = {
  SINO: 'Sino',
  BIPE: 'Bipe curto',
  DUPLO: 'Dois toques',
};

interface Nota {
  frequencia: number;
  inicio: number;
  duracao: number;
  forma: OscillatorType;
}

const SONS: Record<NomeSom | 'ERRO', Nota[]> = {
  SINO: [
    { frequencia: 880, inicio: 0, duracao: 0.6, forma: 'sine' },
    { frequencia: 1320, inicio: 0, duracao: 0.4, forma: 'sine' },
  ],
  BIPE: [{ frequencia: 1000, inicio: 0, duracao: 0.12, forma: 'square' }],
  DUPLO: [
    { frequencia: 784, inicio: 0, duracao: 0.12, forma: 'triangle' },
    { frequencia: 1046, inicio: 0.15, duracao: 0.18, forma: 'triangle' },
  ],
  // Erro: grave e descendente, para não confundir com a confirmação
  ERRO: [
    { frequencia: 330, inicio: 0, duracao: 0.18, forma: 'sawtooth' },
    { frequencia: 220, inicio: 0.2, duracao: 0.28, forma: 'sawtooth' },
  ],
};

let contexto: AudioContext | null = null;

export function tocarSom(nome: NomeSom | 'ERRO') {
  try {
    contexto ??= new AudioContext();
    const agora = contexto.currentTime;
    for (const nota of SONS[nome]) {
      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();
      oscilador.type = nota.forma;
      oscilador.frequency.value = nota.frequencia;
      // Entrada e saída suaves evitam estalos
      volume.gain.setValueAtTime(0.0001, agora + nota.inicio);
      volume.gain.exponentialRampToValueAtTime(0.25, agora + nota.inicio + 0.01);
      volume.gain.exponentialRampToValueAtTime(0.0001, agora + nota.inicio + nota.duracao);
      oscilador.connect(volume).connect(contexto.destination);
      oscilador.start(agora + nota.inicio);
      oscilador.stop(agora + nota.inicio + nota.duracao + 0.05);
    }
  } catch {
    // Navegador sem áudio ou bloqueado: o aviso visual continua aparecendo
  }
}
