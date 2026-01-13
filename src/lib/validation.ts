export const withSchema = (schema: any, handler: (evt: any) => Promise<void>) => {
  return async (raw: unknown) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.error('Invalid event payload', result.error.format());
      return;
    }
    await handler(result.data);
  };
};
