import { zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
export { zxcvbn } from '@zxcvbn-ts/core';

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,

  graphs: zxcvbnCommonPackage.adjacencyGraphs,

  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
});
