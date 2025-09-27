import { clientStore, editor } from "@silverbulletmd/silverbullet/syscalls";

export class StateProvider {
  graphViewKey: string;

  constructor(graphViewKey: string) {
    this.graphViewKey = graphViewKey;
  }

  async getGraphViewStatus(): Promise<boolean> {
    return !!(await clientStore.get(this.graphViewKey));
  }
  async setGraphViewStatus(state: boolean): Promise<void> {
    await clientStore.set(this.graphViewKey, state);
  }
  async toggleGraphViewStatus(): Promise<void> {
    await clientStore.set(this.graphViewKey, !await this.getGraphViewStatus());
  }
  async darkMode(): Promise<boolean> {
    // Try UI option first
    const uiOption = await editor.getUiOption("darkMode");
    if (uiOption !== undefined && uiOption !== null) {
      return !!uiOption;
    }

    // Infer from document.documentElement.dataset.theme ("dark" | "light" | ...) as fallback
    try {
      const theme = (globalThis as any)?.document?.documentElement?.dataset?.theme as
        | string
        | undefined;
      if (theme) {
        return theme.toLowerCase() === "dark";
      }
    } catch { }

    return false;
  }
}
