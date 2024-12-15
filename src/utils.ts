export function padWithZeros(value: number | string, finalLength: number): string {
  let valueString = String(value);
  while (valueString.length < finalLength) {
    valueString = `0${valueString}`;
  }
  return valueString;
}
