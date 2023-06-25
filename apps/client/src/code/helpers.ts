import type { Ref } from 'vue';
import type { RouteLocationNormalized, Router } from 'vue-router';

function makeHelper<T>(
  name: string,
  helperFunc: () => T,
  globalPropKey: string,
) {
  let _value: T;

  return (value?: T) => {
    if (_value != null) {
      return _value;
    }

    if (value == null) {
      value = helperFunc();
    }

    if (value == null) {
      value =
        getCurrentInstance()?.appContext.app.config.globalProperties[
          globalPropKey
        ];
    }

    if (value == null) {
      throw new Error(`Unable to load ${name}.`);
    }

    if (process.env.CLIENT) {
      _value = value;
    }

    return value;
  };
}

export const router = makeHelper('router', useRouter, '$router');
export const $quasar = makeHelper('Quasar', useQuasar, '$q');

// Route

let _route: Ref<RouteLocationNormalized>;

export function route(router_?: Router) {
  if (_route != null) {
    return _route;
  }

  let route: Ref<RouteLocationNormalized> | undefined;

  if (route == null) {
    route = router(router_).currentRoute;
  }

  if (route == null) {
    throw new Error('Unable to load route.');
  }

  if (process.env.CLIENT) {
    _route = route;
  }

  return route;
}
