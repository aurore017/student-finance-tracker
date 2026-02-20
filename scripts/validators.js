export const patterns = {
  description: /^\S(?:.*\S)?$/,
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/
};

export function validate(d) {
  for (const k in patterns) {
    if (!patterns[k].test(d[k])) return `${k} invalid`;
  }
  return null;
}
