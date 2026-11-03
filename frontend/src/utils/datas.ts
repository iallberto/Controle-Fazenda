// Datas no formato AAAA-MM-DD dos campos <input type="date">, no fuso local.
// toISOString() usa UTC e, no Brasil, vira o dia seguinte a partir das 21h.
export function dataLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hojeLocal(): string {
  return dataLocal(new Date());
}

export function primeiroDiaDoMesLocal(): string {
  const data = new Date();
  data.setDate(1);
  return dataLocal(data);
}
