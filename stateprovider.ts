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
    return !!(await editor.getUiOption("darkMode"));
  }
}
