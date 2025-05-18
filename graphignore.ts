import { editor, space, system } from "@silverbulletmd/silverbullet/syscalls";
import { readGraphviewSettings } from "utils";

export class GraphIgnore {
  ignoredPages: string[];
  ignoredPrefixes: string[];

  constructor(ignoredPages: string[] = [], ignoredPrefixes: string[] = []) {
    this.ignoredPages = ignoredPages;
    this.ignoredPrefixes = ignoredPrefixes;
  }

  // Get all pages tagged with graphignore
  async init(pages: any): Promise<void> {
    const ignoredPrefixesFromSettings = await readGraphviewSettings("ignoredPrefixes");
    this.ignoredPrefixes = ignoredPrefixesFromSettings ? ignoredPrefixesFromSettings : [];
    this.ignoredPages = pages.filter((page: any) => this.isIgnoredPage(page)).map(({ name }) => {return name;});
  }

  // Check if a page is tagged with graphignore
  isIgnoredPage(page: any): boolean {
    return page.tags.includes("graphignore") || this.ignoredPrefixes.some(prefix => page.name.startsWith(prefix));
  }

  // Filter function to remove pages tagged with graphignore
  pagefilter(page: any) {
    return !this.ignoredPages.includes(page.name);
  }

  // Filter function to remove links to and from pages tagged with graphignore
  linkfilter(link: any) {
    return !this.ignoredPages.includes(link.page) &&
      ((link.hasOwnProperty("toPage") && !this.ignoredPages.includes(link.toPage)) ||
       (link.hasOwnProperty("toFile") && !this.ignoredPages.includes(link.toFile)));
  }
}
