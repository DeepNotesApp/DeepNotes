import { objEntries } from '@stdlib/misc';
import { boot } from 'quasar/wrappers';

export default boot(async () => {
  const originalSetItem = internals.sessionStorage.setItem;
  const originalRemoveItem = internals.sessionStorage.removeItem;
  const originalClear = internals.sessionStorage.clear;

  window.addEventListener('storage', function (event) {
    if (event.oldValue != null) {
      return;
    }

    if (event.key === 'requestSessionStorage') {
      internals.localStorage.setItem(
        'initSessionStorage',
        JSON.stringify(internals.sessionStorage),
      );
      internals.localStorage.removeItem('initSessionStorage');
    } else if (
      event.key === 'initSessionStorage' &&
      internals.sessionStorage.length === 0
    ) {
      const data = JSON.parse(event.newValue ?? '{}');

      for (const [key, value] of objEntries(data)) {
        originalSetItem.call(internals.sessionStorage, key, value);
      }
    } else if (event.key === 'updateSessionStorage') {
      const data = JSON.parse(event.newValue ?? '{}');

      originalSetItem.call(internals.sessionStorage, data.key, data.value);
    } else if (event.key === 'removeSessionStorage') {
      originalRemoveItem.call(internals.sessionStorage, event.newValue ?? '');
    } else if (event.key === 'clearSessionStorage') {
      originalClear.call(internals.sessionStorage);
    }
  });

  if (internals.sessionStorage.length === 0) {
    internals.localStorage.setItem('requestSessionStorage', '');
    internals.localStorage.removeItem('requestSessionStorage');
  }

  internals.sessionStorage.setItem = (key, value) => {
    originalSetItem.call(internals.sessionStorage, key, value);

    internals.localStorage.setItem(
      'updateSessionStorage',
      JSON.stringify({ key, value }),
    );
    internals.localStorage.removeItem('updateSessionStorage');
  };

  internals.sessionStorage.removeItem = (key) => {
    originalRemoveItem.call(internals.sessionStorage, key);

    internals.localStorage.setItem('removeSessionStorage', key);
    internals.localStorage.removeItem('removeSessionStorage');
  };

  internals.sessionStorage.clear = () => {
    originalClear.call(internals.sessionStorage);

    internals.localStorage.setItem('clearSessionStorage', '');
    internals.localStorage.removeItem('clearSessionStorage');
  };
});
