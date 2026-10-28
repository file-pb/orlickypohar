// Soubory v paměti. GPX se v testu jen skládá (zápis a sdílení testuje až
// telefon), ale paměť banneru se čte zpátky, takže obsah musí zůstat —
// náhrada, která zápis zahodí, by předstírala, že si appka nic nepamatuje.
const obsah = new Map();

export const Paths = { cache: '/tmp', document: '/doc' };

export class File {
  constructor(dir, name) { this.uri = `${dir}/${name}`; }
  get exists() { return obsah.has(this.uri); }
  create() { if (!obsah.has(this.uri)) obsah.set(this.uri, ''); }
  write(t) { obsah.set(this.uri, String(t)); }
  textSync() { return obsah.get(this.uri) ?? ''; }
  delete() { obsah.delete(this.uri); }
}

/** Pro testy: vyprázdní vše, co se „zapsalo". */
export function zapomenVse() { obsah.clear(); }
