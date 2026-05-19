export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  if (!markdown.startsWith("---\n")) {
    return { frontmatter: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const raw = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).replace(/^\n/, "");
  return { frontmatter: parseYamlSubset(raw), body };
}

function parseYamlSubset(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = raw.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) {
      index += 1;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const key = match[1];
    const value = match[2].trim();
    if (value === "|" || value === ">") {
      const block: string[] = [];
      index += 1;
      while (index < lines.length && /^\s+/.test(lines[index])) {
        block.push(lines[index].replace(/^\s{2}/, ""));
        index += 1;
      }
      result[key] = value === ">" ? block.join(" ").trim() : block.join("\n").trim();
      continue;
    }

    if (value === "") {
      const nested = parseNested(lines, index + 1, key);
      Object.assign(result, nested.values);
      result[key] = nested.consumed > 0 ? result[key] ?? {} : [];
      index += nested.consumed + 1;
      continue;
    }

    result[key] = coerceValue(value);
    index += 1;
  }

  return result;
}

function parseNested(lines: string[], start: number, parent: string): { values: Record<string, unknown>; consumed: number } {
  const values: Record<string, unknown> = {};
  let consumed = 0;
  let currentKey = "";

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      consumed += 1;
      continue;
    }
    if (!/^\s+/.test(line)) break;

    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentKey) {
      const existing = Array.isArray(values[currentKey]) ? values[currentKey] as unknown[] : [];
      existing.push(coerceValue(listMatch[1]));
      values[currentKey] = existing;
      consumed += 1;
      continue;
    }

    const nestedMatch = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!nestedMatch) break;
    currentKey = `${parent}.${nestedMatch[1]}`;
    const value = nestedMatch[2].trim();
    values[currentKey] = value === "" ? [] : coerceValue(value);
    consumed += 1;
  }

  return { values, consumed };
}

function coerceValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\[(.*)\]$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => stripQuotes(item.trim()));
  }
  return stripQuotes(trimmed);
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}
