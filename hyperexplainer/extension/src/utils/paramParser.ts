export function parseHyperparams(code: string): { name: string; value: string }[] {
    const regex = /(\w+)\s*=\s*([0-9]+(?:\.[0-9]+)?)/g;
    const out: { name: string; value: string }[] = [];
    let m;
    while ((m = regex.exec(code)) !== null) {
      out.push({ name: m[1], value: m[2] });
    }
    return out;
  }