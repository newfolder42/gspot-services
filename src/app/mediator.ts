export type Handler = (event: unknown) => Promise<void>;

export class Mediator {
  private handlers = new Map<string, Handler[]>();

  register(channel: string, handler: Handler) {
    const list = this.handlers.get(channel) ?? [];
    list.push(handler);
    this.handlers.set(channel, list);
  }

  async dispatch(channel: string, event: unknown) {
    for (const handler of this.handlers.get(channel) || []) {
      try {
        await handler(event);
      } catch (err) {
        console.error('Handler error for channel', channel, err);
      }
    }
  }
}
