import { z } from 'zod';

export const withSchema = <S extends z.ZodType>(
  schema: S,
  handler: (evt: z.infer<S>) => Promise<void>
) => {
  return async (raw: unknown) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.error('Invalid event payload', z.treeifyError(result.error));
      return;
    }
    await handler(result.data);
  };
};
