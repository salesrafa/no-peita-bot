import dayjs from 'dayjs';
import { Moon, Hemisphere } from 'lunarphase-js';

/**
 * Gera uma lista de datas em que houve lua cheia no mês e ano especificados.
 * As datas retornadas estão no formato DD/MM/YYYY.
 */
export function gerarDatasLuaCheia(ano: number, mes: number): string[] {
  const datas: string[] = [];

  for (let dia = 1; dia <= 31; dia++) {
    const data = dayjs(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
    if (!data.isValid()) continue;

    const fase = Moon.lunarPhase(data.toDate(), { hemisphere: Hemisphere.SOUTHERN });

    if (fase === 'Full') {
      datas.push(data.format('DD/MM/YYYY'));
    }
  }

  return datas;
}
