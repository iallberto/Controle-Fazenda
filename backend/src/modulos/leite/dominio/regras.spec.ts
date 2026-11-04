import { Sexo, VacaDeLeite } from '../../../animal/entities/animal.entity';
import {
  LITROS_MAXIMO_SEM_CONFIRMAR,
  calcularDel,
  carenciaAte,
  ehVacaDeLeite,
  normalizarNome,
  secagemPlanejada,
  turnoPelaHora,
  validarLitrosDaVaca,
} from './regras';

describe('regras do Leite (spec 004)', () => {
  describe('ehVacaDeLeite (FR-004, FR-004b)', () => {
    const femea = (vacaDeLeite: VacaDeLeite, leiteira: boolean | null) => ({
      sexo: Sexo.F,
      vacaDeLeite,
      raca: leiteira === null ? null : { leiteira },
    });

    it('pela raça: vale a marca leiteira da raça', () => {
      expect(ehVacaDeLeite(femea(VacaDeLeite.PELA_RACA, true))).toBe(true);
      expect(ehVacaDeLeite(femea(VacaDeLeite.PELA_RACA, false))).toBe(false);
    });

    it('pela raça, sem raça: não é', () => {
      expect(ehVacaDeLeite(femea(VacaDeLeite.PELA_RACA, null))).toBe(false);
    });

    it('SIM vale para raça de corte ou sem raça; NAO tira a raça leiteira', () => {
      expect(ehVacaDeLeite(femea(VacaDeLeite.SIM, false))).toBe(true);
      expect(ehVacaDeLeite(femea(VacaDeLeite.SIM, null))).toBe(true);
      expect(ehVacaDeLeite(femea(VacaDeLeite.NAO, true))).toBe(false);
    });

    it('macho nunca é vaca de leite', () => {
      expect(
        ehVacaDeLeite({ sexo: Sexo.M, vacaDeLeite: VacaDeLeite.SIM, raca: { leiteira: true } }),
      ).toBe(false);
    });
  });

  it('calcularDel: dias desde o início da lactação (FR-007)', () => {
    expect(calcularDel('2026-11-04', '2026-11-04')).toBe(0);
    expect(calcularDel('2026-07-27', '2026-11-04')).toBe(100);
  });

  it('secagemPlanejada: parto previsto menos o prazo; sem previsão, nenhuma (FR-019)', () => {
    expect(secagemPlanejada('2027-01-15', 60)).toBe('2026-11-16');
    expect(secagemPlanejada(null, 60)).toBeNull();
  });

  describe('carenciaAte (FR-016)', () => {
    const carencias = [
      { data: '2026-11-01', dataFim: '2026-11-05' },
      { data: '2026-11-03', dataFim: '2026-11-08' },
      { data: '2026-10-01', dataFim: '2026-10-03' },
    ];

    it('vale a data final mais distante entre as que cobrem o dia', () => {
      expect(carenciaAte(carencias, '2026-11-04')).toBe('2026-11-08');
    });

    it('cobre o primeiro e o último dia do prazo', () => {
      expect(carenciaAte(carencias, '2026-11-01')).toBe('2026-11-05');
      expect(carenciaAte(carencias, '2026-11-08')).toBe('2026-11-08');
    });

    it('fora de qualquer prazo: null', () => {
      expect(carenciaAte(carencias, '2026-11-09')).toBeNull();
      expect(carenciaAte(carencias, '2026-10-31')).toBeNull();
      expect(carenciaAte([], '2026-11-04')).toBeNull();
    });
  });

  it('turnoPelaHora: antes do meio-dia 1.º; depois 2.º; com 3 ordenhas, 3.º a partir das 18 h (R12)', () => {
    expect(turnoPelaHora(5, 2)).toBe(1);
    expect(turnoPelaHora(15, 2)).toBe(2);
    expect(turnoPelaHora(20, 2)).toBe(2);
    expect(turnoPelaHora(20, 3)).toBe(3);
    expect(turnoPelaHora(15, 1)).toBe(1);
  });

  describe('validarLitrosDaVaca (FR-011)', () => {
    it('aceita de 0 a 80 com uma casa decimal', () => {
      expect(validarLitrosDaVaca(0, false)).toBeNull();
      expect(validarLitrosDaVaca(12.5, false)).toBeNull();
      expect(validarLitrosDaVaca(LITROS_MAXIMO_SEM_CONFIRMAR, false)).toBeNull();
    });

    it('acima de 80 só com confirmação', () => {
      expect(validarLitrosDaVaca(95, false)).toMatch(/confirm/i);
      expect(validarLitrosDaVaca(95, true)).toBeNull();
    });

    it('recusa negativo, mais de uma casa decimal e valor absurdo', () => {
      expect(validarLitrosDaVaca(-1, false)).not.toBeNull();
      expect(validarLitrosDaVaca(12.55, false)).not.toBeNull();
      expect(validarLitrosDaVaca(500, true)).not.toBeNull();
    });
  });

  it('normalizarNome: sem acento, sem maiúscula e sem espaços nas pontas', () => {
    expect(normalizarNome('  Antibiótico X ')).toBe('antibiotico x');
  });
});
