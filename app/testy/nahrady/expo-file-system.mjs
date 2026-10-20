// GPX se v testu jen skládá; zápis souboru a sdílení testuje až telefon.
export const Paths = { cache: '/tmp' };
export class File {
  constructor(dir, name) { this.uri = `${dir}/${name}`; this.exists = false; }
  create() {} write() {} delete() {}
}
