/** Splits policy text into plain parts and {tokens} (filled in from company details). */
export function withTokens(text: string) {
  return text
    .split(/(\{[a-z_]+\})/g)
    .filter(Boolean)
    .map((part) => ({ text: part, token: /^\{[a-z_]+\}$/.test(part) }))
}
