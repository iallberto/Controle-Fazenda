import { estaApta, motivoInaptidao } from './aptidao';
import {
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../../animal/entities/animal.entity';

describe('aptidão à cobertura', () => {
  const hoje = '2026-11-03';
  const matriz = {
    status: StatusAnimal.ATIVO,
    sexo: Sexo.F,
    categoria: CategoriaAnimal.MATRIZ,
    statusReprodutivo: null,
  };

  it('aceita matriz e novilha ativas sem parto recente', () => {
    expect(estaApta(matriz, null, hoje)).toBe(true);
    expect(
      estaApta({ ...matriz, categoria: CategoriaAnimal.NOVILHA }, null, hoje),
    ).toBe(true);
    expect(
      estaApta(
        { ...matriz, statusReprodutivo: StatusReprodutivo.VAZIA },
        null,
        hoje,
      ),
    ).toBe(true);
  });

  it('recusa macho e categorias que não entram em cobertura', () => {
    expect(
      motivoInaptidao(
        { ...matriz, sexo: Sexo.M, categoria: CategoriaAnimal.TOURO },
        null,
        hoje,
      ),
    ).toMatch('fêmea');
  });

  it('recusa animal fora do rebanho', () => {
    expect(
      motivoInaptidao({ ...matriz, status: StatusAnimal.VENDIDO }, null, hoje),
    ).toMatch('rebanho');
  });

  it('recusa fêmea prenhe', () => {
    expect(
      motivoInaptidao(
        { ...matriz, statusReprodutivo: StatusReprodutivo.PRENHE },
        null,
        hoje,
      ),
    ).toMatch('prenhe');
  });

  it('recusa parida há menos de 45 dias e aceita a partir do 45º dia', () => {
    const lactante = {
      ...matriz,
      statusReprodutivo: StatusReprodutivo.LACTANTE,
    };
    expect(motivoInaptidao(lactante, '2026-10-14', hoje)).toMatch('28/11/2026');
    expect(estaApta(lactante, '2026-09-19', hoje)).toBe(true);
  });
});
