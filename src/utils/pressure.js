/* ============================================================
   BREWLOG NOTE — src/utils/pressure.js
   ULKA E5 공식 펌프 곡선 기반 추출 압력 계산
   ─ 유량(cc/min) → 선형 보간 → 펌프 압력(bar)
   ─ 추출 압력 = 펌프 압력 - 0.8 bar (배관 손실)
   참고: DIYCoffeeGuy GitHub + Home-Barista.com
   ============================================================ */

// ULKA E5 공식 펌프 곡선 데이터
const PUMP_CURVE = [
  { flow:   0, bar: 14.5 },
  { flow:  30, bar: 14.0 },
  { flow:  60, bar: 13.2 },
  { flow:  90, bar: 12.4 },
  { flow: 120, bar: 11.5 },
  { flow: 150, bar: 10.6 },
  { flow: 180, bar:  9.7 },
  { flow: 210, bar:  8.7 },
  { flow: 240, bar:  7.6 },
  { flow: 270, bar:  6.4 },
  { flow: 300, bar:  5.0 },
  { flow: 330, bar:  3.3 },
  { flow: 350, bar:  2.0 },
];

const PIPE_LOSS = 0.8; // 보일러 + 배관 + 그룹헤드 저항(bar)

/**
 * 에스프레소 추출 압력 계산
 * @param {number|string} espressoMl - 추출량 (ml)
 * @param {number|string} seconds    - 추출 시간 (초)
 * @returns {{ flowRate, pumpBar, showerBar, status } | null}
 */
export function calcPressure(espressoMl, seconds) {
  if (!espressoMl || !seconds || seconds <= 0) return null;
  const ml  = Number(espressoMl);
  const sec = Number(seconds);
  if (ml <= 0 || sec <= 0) return null;

  // 유량 cc/min
  const flowRate = (ml / sec) * 60;

  // 선형 보간으로 펌프 압력 계산
  let pumpBar = 14.5;
  const last  = PUMP_CURVE[PUMP_CURVE.length - 1];

  if (flowRate >= last.flow) {
    pumpBar = last.bar;
  } else {
    for (let i = 0; i < PUMP_CURVE.length - 1; i++) {
      const a = PUMP_CURVE[i];
      const b = PUMP_CURVE[i + 1];
      if (flowRate >= a.flow && flowRate < b.flow) {
        const t = (flowRate - a.flow) / (b.flow - a.flow);
        pumpBar = a.bar + t * (b.bar - a.bar);
        break;
      }
    }
  }

  const brewBar = pumpBar - PIPE_LOSS;

  return {
    flowRate: Math.round(flowRate),
    pumpBar:  Math.round(pumpBar  * 10) / 10,
    showerBar: Math.round(brewBar * 10) / 10,
    status:
      brewBar >= 9 && brewBar <= 11 ? "good"
      : brewBar > 11                ? "high"
      : "low",
  };
}
