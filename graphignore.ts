import { editor, space, system } from "@silverbulletmd/silverbullet/syscalls";
import { readGraphviewSettings } from "utils";

export class GraphIgnore {
  ignoredPages: string[];
  ignoredPrefixes: string[];

  constructor(ignoredPages: string[] = []) {
    this.ignoredPages = ignoredPages;
  }

  // Get all pages tagged with graphignore
  async init(): Promise<void> {
    this.ignoredPrefixes = await readGraphviewSettings("ignoredPrefixes");
    this.ignoredPages = (await system.invokeFunction("index.queryObjects", "tag", {
      filter: ["=", ["attr", "name"], ["string", "graphignore"]],
    })).map((tag) => tag.page);
  }

  // Check if a page is tagged with graphignore
  isIgnoredPage(page: string): boolean {
    return this.ignoredPages.includes(page) || this.ignoredPrefixes.some(prefix => page.startsWith(prefix));
  }

  // Filter function to remove pages tagged with graphignore
  pagefilter(page: any) {
    return !this.isIgnoredPage(page.name);
  }

  // Filter function to remove links to and from pages tagged with graphignore
  linkfilter(link: any) {
    return !this.isIgnoredPage(link.page) &&
      ((link.hasOwnProperty("toPage") && !this.isIgnoredPage(link.toPage)) ||
       (link.hasOwnProperty("toFile") && !this.isIgnoredPage(link.toFile)));
  }
}
