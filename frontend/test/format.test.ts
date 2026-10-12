import { expect, test } from 'vitest';
import { parseMoney, themeText } from '../src/utils/format';
test('converte reais em centavos exatos e respeita os limites financeiros', () => {
  expect(parseMoney('27,50')).toBe(2750);
  expect(parseMoney('0.29')).toBe(29);
  expect(parseMoney('21474836,47')).toBe(2147483647);
  expect(parseMoney('', true)).toBeNull();
  for (const invalid of [
    '0',
    '-1',
    '27,501',
    '1.000,00',
    '21474836,48',
    'Infinity',
    '',
  ])
    expect(() => parseMoney(invalid)).toThrow();
});
test('seleciona a cor de texto com maior contraste', () => {
  expect(themeText('#ffffff')).toBe('#000000');
  expect(themeText('#000000')).toBe('#ffffff');
});
