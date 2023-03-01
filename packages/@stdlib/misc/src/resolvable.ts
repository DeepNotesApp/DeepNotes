export class Resolvable<T = void> implements Promise<T> {
  [Symbol.toStringTag]!: string;

  resolve!: (value: T) => void;
  reject!: (reason?: any) => void;

  private _resolved = false;
  get resolved(): boolean {
    return this._resolved;
  }

  private _rejected = false;
  get rejected(): boolean {
    return this._rejected;
  }

  get settled(): boolean {
    return this._resolved || this._rejected;
  }

  private readonly _promise = new Promise<T>((resolve, reject) => {
    this.resolve = (value) => {
      this._resolved = true;

      resolve(value);
    };
    this.reject = (reason) => {
      this._rejected = true;

      reject(reason);
    };
  });

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason?: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }
  catch<TResult = never>(
    onrejected?: ((reason?: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this._promise.catch(onrejected);
  }
  finally(onfinally?: (() => void) | null): Promise<T> {
    return this._promise.finally(onfinally);
  }
}
