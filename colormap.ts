import { Tag } from "model";
import { space, system } from "@silverbulletmd/silverbullet/syscalls";
import { readGraphviewSettings } from "utils";
import { PageMeta } from "@silverbulletmd/silverbullet/types";

export class ColorMap {
  page: string;
  color: string;

  constructor(page: string, color: string) {
    this.page = page;
    this.color = color;
  }
}

export class ColorMapBuilder {
  colorMapSettings: any;
  colorMapPathSettings: any;
  colorMapTagSettings: any;
  spacetags: Tag[];
  spacepages: PageMeta[]
  taggedPages: string[];
  individuallyTaggedPages: any;
  default_color: any;
  builtin_default_color: any;

  async init(pages: any, darkmode: boolean): Promise<void> {
    // Read settings
    this.colorMapSettings = await readGraphviewSettings("colormap");
    console.log(this.colorMapSettings);
    this.colorMapPathSettings = this.colorMapSettings ? this.colorMapSettings["path"] : [];
    this.colorMapTagSettings = this.colorMapSettings ? this.colorMapSettings["tag"] : [];
    this.spacepages = pages;

    // Get default color
    this.default_color = await readGraphviewSettings("default_color");

    // Set builtin default color
    this.builtin_default_color = darkmode ? "bfbfbf" : "000000";
  }

  build(): ColorMap[] {
    // Iterate over all pages
    return this.spacepages.map((page) => {
      // If page has tag with "tag:node_color=" → use color from tag and continue
      if (page.tags.find((t) => t.startsWith("node_color="))) {
        return { "page": page.name, "color": page.tags.find((t) => t.startsWith("node_color=")).split("=")[1] };
      }

      // If page has a tag from colorMapSettings ["tag"] →  map color code to page name and continue
      if (this.colorMapTagSettings) {
        // check, if any of the tags is in colorMapSettings
        const pageTagsInColorMapSettings = page.tags.filter((tag) =>
          this.colorMapTagSettings.hasOwnProperty(tag),
        );
        // if yes, use color from colorMapSettings
        if (pageTagsInColorMapSettings.length > 0) {
          return { "page": page.name, "color": this.colorMapTagSettings[pageTagsInColorMapSettings[0]] };
        }
      }

      // If page name begins with element colorMapSettings ["path"] → map color code to page name and continue
      if (this.colorMapPathSettings) {
        // console.log(Object.keys(this.colorMapPathSettings))
        const pageNameBeginsWithPath = Object.keys(this.colorMapPathSettings)
          .find((path: string) => page.name.startsWith(path));
        if (pageNameBeginsWithPath) {
          return { "page": page.name, "color": this.colorMapPathSettings[pageNameBeginsWithPath] };
        }
      }

      // Use default color
      return { "page": page.name, "color": this.default_color ? this.default_color : this.builtin_default_color };
    });
  }
}
