export type BaseEvent<T> = {
  resource: "post";
  action: "created";
  createdAt: string;
  payload: T;
};
