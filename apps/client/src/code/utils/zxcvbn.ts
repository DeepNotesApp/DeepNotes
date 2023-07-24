import { zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';
export { zxcvbn } from '@zxcvbn-ts/core';

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,

  graphs: zxcvbnCommonPackage.adjacencyGraphs,

  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
});
