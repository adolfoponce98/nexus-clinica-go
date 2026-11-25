export type LmsRow = [number, number, number, number];
export function lmsValue(row: LmsRow, z: number): number {
  const [, l, m, s] = row;
  return Math.abs(l) < 1e-10 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}
export function lmsZ(row: LmsRow, value: number): number {
  const [, l, m, s] = row;
  const raw =
    Math.abs(l) < 1e-10 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
  if (raw > 3) {
    const high = lmsValue(row, 3),
      prior = lmsValue(row, 2);
    return 3 + (value - high) / (high - prior);
  }
  if (raw < -3) {
    const low = lmsValue(row, -3),
      next = lmsValue(row, -2);
    return -3 + (value - low) / (next - low);
  }
  return raw;
}
export function percentile(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)),
    density = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI),
    tail =
      density *
      t *
      (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return (z >= 0 ? 1 - tail : tail) * 100;
}
export function interpolateLms(rows: LmsRow[], age: number): LmsRow | null {
  if (!rows.length || age < rows[0][0] || age > rows[rows.length - 1][0]) return null;
  const i = rows.findIndex((r) => r[0] >= age);
  if (i === 0 || rows[i][0] === age) return rows[i];
  const a = rows[i - 1],
    b = rows[i],
    f = (age - a[0]) / (b[0] - a[0]);
  return [age, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
}
