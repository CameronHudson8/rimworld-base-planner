export type UnsubscribeFunc = () => void;
export type NotifyFunc<T> = (update: T) => void

export interface Publisher<T> {
  addSubscriber(notify: NotifyFunc<T>): UnsubscribeFunc;
}
