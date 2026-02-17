// Utility to format bigints or exponential/large numeric values into readable strings
export function formatBigNumber(
  value: number | bigint | string,
  decimals = 2,
): string {
  if (value === null || value === undefined) return "-";

  // Convert bigint to number-string safely
  let numStr: string;
  if (typeof value === "bigint") {
    numStr = value.toString();
  } else if (typeof value === "number") {
    // handle NaN/Infinity
    if (!isFinite(value)) return String(value);
    numStr = String(value);
  } else {
    numStr = value;
  }

  // If value is in exponential notation, convert to decimal string
  if (/[eE]/.test(numStr)) {
    try {
      numStr = scientificToDecimal(numStr);
    } catch (e) {
      // fallback to original
    }
  }

  // Try parse as float
  const num = Number(numStr);
  if (isNaN(num)) return numStr;

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  const units = ["", "K", "M", "B", "T", "P"];
  let unit = "";
  let valueForDisplay = abs;

  for (let i = units.length - 1; i > 0; i--) {
    const threshold = Math.pow(1000, i);
    if (abs >= threshold) {
      unit = units[i];
      valueForDisplay = abs / threshold;
      break;
    }
  }

  // For small numbers show full decimal up to requested decimals without unit
  if (unit === "") {
    return (
      sign +
      Number(valueForDisplay).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })
    );
  }

  return (
    sign + Number(valueForDisplay).toFixed(decimals).replace(/\.0+$/, "") + unit
  );
}

export function scientificToDecimal(numStr: string): string {
  // Accepts strings like '1.23e+6' or '1e-8'
  // Use BigInt-friendly approach via Big.js is avoided; implement manual conversion.
  const match = numStr.match(/^([-+]?)(\d+(?:\.\d+)?)[eE]([-+]?\d+)$/);
  if (!match) return numStr;
  const sign = match[1] === "-" ? "-" : "";
  let coeff = match[2].replace(".", "");
  const exp = parseInt(match[3], 10);
  const decIndex = match[2].indexOf(".");

  let decimals = 0;
  if (decIndex >= 0) decimals = match[2].length - decIndex - 1;

  let adjustedExp = exp - decimals;
  if (adjustedExp >= 0) {
    return sign + coeff + "0".repeat(adjustedExp);
  } else {
    const pos = coeff.length + adjustedExp;
    if (pos > 0) {
      return sign + coeff.slice(0, pos) + "." + coeff.slice(pos);
    } else {
      return sign + "0." + "0".repeat(Math.abs(pos)) + coeff;
    }
  }
}

export function shortenHash(hash: string, left = 8, right = 6): string {
  if (!hash) return "";
  if (hash.length <= left + right + 3) return hash;
  return `${hash.slice(0, left)}...${hash.slice(-right)}`;
}

export default formatBigNumber;
