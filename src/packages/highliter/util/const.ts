import HighlightSource from "../model/source";
import { ERROR } from "../types";
import camel from "./camel";
import EventEmitter from "./event.emitter";

export const ID_DIVISION = ';';
export const LOCAL_STORE_KEY = 'highlight-ai-read';
export const STYLESHEET_ID = 'highlight-ai-read-style';

export const DATASET_IDENTIFIER = 'ai-read-id';
export const DATASET_IDENTIFIER_EXTRA = 'ai-read-id-extra';
export const DATASET_SPLIT_TYPE = 'ai-read-split-type';
export const CAMEL_DATASET_IDENTIFIER = camel(DATASET_IDENTIFIER);
export const CAMEL_DATASET_IDENTIFIER_EXTRA = camel(DATASET_IDENTIFIER_EXTRA);
export const CAMEL_DATASET_SPLIT_TYPE = camel(DATASET_SPLIT_TYPE);
export const ROOT_IDX = -2;
export const UNKOWN_IDX = -1;
export const INTERNAL_ERROR_EVENT = 'error';
export const DEFAULT_WRAP_TAG = 'markerow9';

export const getDefaultOptions = () => ({
  $root: document,
  exceptSelectors: null,
  wrapTag: DEFAULT_WRAP_TAG,
  verbose: false,
  style: {
    className: 'highlight-ai-read-default',
  },
});

// 这个可以进行改造一下
export const getStylesheet = () => `
    .${getDefaultOptions().style.className} {
        text-decoration: red wavy underline;
        cursor: pointer;
    }
    .${getDefaultOptions().style.className}.active {
        background: #999;
    }
`;

interface EventHandlerMap {
  [key: string]: (...args: any[]) => void;
  error: (data: { type: ERROR; detail?: HighlightSource; error?: any }) => void;
}

class ErrorEventEmitter extends EventEmitter<EventHandlerMap> { }

export const eventEmitter = new ErrorEventEmitter();
