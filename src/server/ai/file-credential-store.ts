import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Credential, CredentialInfo, CredentialStore } from '@earendil-works/pi-ai';

type CredentialFile = Record<string, Credential>;

export class FileCredentialStore implements CredentialStore {
  private readonly queues = new Map<string, Promise<void>>();

  constructor(private readonly path: string) {}

  async read(providerId: string): Promise<Credential | undefined> {
    return (await this.readAll())[providerId];
  }

  async list(): Promise<readonly CredentialInfo[]> {
    const values = await this.readAll();
    return Object.entries(values).map(([providerId, credential]) => ({ providerId, type: credential.type }));
  }

  async modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>,
  ): Promise<Credential | undefined> {
    return await this.serialized(providerId, async () => {
      const values = await this.readAll();
      const next = await fn(values[providerId]);
      if (next !== undefined) {
        values[providerId] = next;
        await this.writeAll(values);
      }
      return next ?? values[providerId];
    });
  }

  async delete(providerId: string): Promise<void> {
    await this.serialized(providerId, async () => {
      const values = await this.readAll();
      if (providerId in values) {
        delete values[providerId];
        await this.writeAll(values);
      }
    });
  }

  private async readAll(): Promise<CredentialFile> {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as CredentialFile : {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  }

  private async writeAll(values: CredentialFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(values)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.path);
    await chmod(this.path, 0o600).catch(() => undefined);
  }

  private async serialized<T>(providerId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(providerId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const chain = previous.then(() => current);
    this.queues.set(providerId, chain);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.queues.get(providerId) === chain) this.queues.delete(providerId);
    }
  }
}
