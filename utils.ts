import { readSetting } from "https://deno.land/x/silverbullet@0.10.1/plug-api/lib/settings_page.ts";
import { editor } from "@silverbulletmd/silverbullet/syscalls";

const POSITIONS = ["rhs", "lhs", "bhs", "modal"] as const;

export type Position = typeof POSITIONS[number];

export async function readGraphviewSettings(key: string) {
  const graphviewSettings = await readSetting("graphview", {});
  if (graphviewSettings[key] !== undefined) {
    return graphviewSettings[key];
  }
  return false;
}

// use internal navigation via syscall to prevent reloading the full page.
// From https://github.com/Willyfrog/silverbullet-backlinks
export async function navigateTo(pageRef: string) {
  if (pageRef.length === 0) {
    console.log("no page name supplied, ignoring navigation");
    return;
  }
  const [page, pos] = pageRef.split("@");
  console.log(`navigating to ${pageRef}`);
  await editor.navigate(page, +pos); // todo: do we have the position for it?
}
