export function createSmartMock(arg?: (() => any) | object): any {
  let obj: any;

  if (typeof arg === 'function') {
    obj = function (...args: any[]) {
      // @ts-ignore
      return arg(...args);
    };
  } else if ((typeof arg === 'object' && arg !== null) || arg === undefined) {
    let fnResult: any;

    obj = function () {
      fnResult ??= createSmartMock();
      return fnResult;
    };
  } else {
    return arg;
  }

  const proxy = new Proxy(obj, {
    apply(_target, thisArg, args) {
      return obj.apply(thisArg, args as any);
    },
    construct(target, args) {
      return obj.apply(target, args as any);
    },
    defineProperty(target, propertyKey, attributes) {
      return Reflect.defineProperty(target, propertyKey, attributes);
    },
    deleteProperty(target, propertyKey) {
      return Reflect.deleteProperty(target, propertyKey);
    },
    get(target, propertyKey, receiver) {
      if (!(propertyKey in target)) {
        if (propertyKey === 'then') {
          (target as any)[propertyKey] = (onfulfilled: any) =>
            Promise.resolve().then(onfulfilled);
        } else {
          (target as any)[propertyKey] = createSmartMock();
        }
      }

      return Reflect.get(target, propertyKey, receiver);
    },
    getOwnPropertyDescriptor(target, propertyKey) {
      return Reflect.getOwnPropertyDescriptor(target, propertyKey);
    },
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    has(target, propertyKey) {
      return Reflect.has(target, propertyKey);
    },
    isExtensible(target) {
      return Reflect.isExtensible(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    preventExtensions(target) {
      return Reflect.preventExtensions(target);
    },
    set(target, propertyKey, value, receiver) {
      return Reflect.set(target, propertyKey, createSmartMock(value), receiver);
    },
    setPrototypeOf(target, prototype) {
      return Reflect.setPrototypeOf(target, prototype);
    },
  });

  if (typeof arg === 'object') {
    Object.assign(proxy, arg);
  }

  return proxy;
}
