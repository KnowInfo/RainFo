import { RootElement } from "../types"
import { CAMEL_DATASET_IDENTIFIER, CAMEL_DATASET_IDENTIFIER_EXTRA, DATASET_IDENTIFIER, ID_DIVISION } from "./const"


export const forEach = ($nodes: NodeList, cb: (n: Node, idx: number, s: NodeList) => void): void => {
  for (let i = 0; i < $nodes.length; i++) {
    cb($nodes[i], i, $nodes);
  }
};

/**
 * whether a wrapper node
 */
export const isHighlightWrapNode = ($node: HTMLElement): boolean => {
  return !!$node.dataset && !!$node.dataset[CAMEL_DATASET_IDENTIFIER]
}

/**
 * ===================================================================================
 * below methods (getHighlightId/getExtraHighlightId)
 * will check whether the node is inside a wrapper iteratively util reach the root node
 * if the node is not inside the root, the id must be empty
 * ====================================================================================
 */
const findAncestorWrapperInRoot = ($node: HTMLElement | null, $root: RootElement): HTMLElement | null => {
  let isInsideRoot = false;
  let $wrapper: HTMLElement | null = null;
  while ($node) {
    if (isHighlightWrapNode($node)) {
      $wrapper = $node
    }
    if ($node == $root) {
      isInsideRoot = true;
      break;
    }
    $node = $node.parentNode as HTMLElement;
  }
  return isInsideRoot ? $wrapper : null;
}

/**
 * get highlight id by a node
 */
export const getHighlightId = ($node: HTMLElement | null, $root: RootElement): string => {
  $node = findAncestorWrapperInRoot($node, $root);
  if (!$node) {
    return '';
  }
  return $node.dataset[CAMEL_DATASET_IDENTIFIER] || '';
};

/**
 * get extra highlight id by a node
 */
export const getExtraHighlightId = ($node: HTMLElement | null, $root: RootElement): string[] => {
  $node = findAncestorWrapperInRoot($node, $root);
  if (!$node) {
    return [];
  }

  return $node.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA]?.split(ID_DIVISION).filter(i => i) || [];
};

/**
 * get all highlight wrapping nodes nodes from a root node
 */
export const getHighlightsByRoot = ($roots: RootElement | RootElement[], wrapTag: string): HTMLElement[] => {
  if (!Array.isArray($roots)) {
    $roots = [$roots];
  }

  const $wraps: HTMLElement[] = [];

  for (const $r of $roots) {
    const $list = $r.querySelectorAll<HTMLElement>(`${wrapTag}[data-${DATASET_IDENTIFIER}]`);
    let $el_list: HTMLElement[] = [];
    for (let i = 0; i < $list.length; i++) {
      $el_list.push($list[i])
    }
    // eslint-disable-next-line prefer-spread
    $wraps.push.apply($wraps, $el_list);
  }

  return $wraps;
};

/**
* get all highlight wrapping nodes by highlight id from a root node
*/
export const getHighlightById = ($root: RootElement, id: string, wrapTag: string): HTMLElement[] => {
  const $highlights: HTMLElement[] = [];
  const reg = new RegExp(`(${id}\\${ID_DIVISION}|\\${ID_DIVISION}?${id}$)`);
  const $list = $root.querySelectorAll<HTMLElement>(`${wrapTag}[data-${DATASET_IDENTIFIER}]`);

  for (const $l of $list) {
    const $n = $l;
    const nid = $n.dataset[CAMEL_DATASET_IDENTIFIER];

    if (nid === id) {
      $highlights.push($n);
      continue;
    }

    const extraId = $n.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA];

    if (extraId && reg.test(extraId)) {
      $highlights.push($n);
      continue;
    }
  }

  return $highlights;
};

export const removeElEventListener = ($el: RootElement, evt: string, fn: EventListenerOrEventListenerObject) => {
  $el.removeEventListener(evt, fn);
}

export const addElEventListener = ($el: RootElement, evt: string, fn: EventListenerOrEventListenerObject) => {
  $el.addEventListener(evt, fn);
  return () => {
    removeElEventListener($el, evt, fn);
  };
};

export const addClass = ($el: HTMLElement, className: string[]
  | string | undefined) => {
  if (!className) {
    return;
  }
  if (!Array.isArray(className)) {
    className = [className]
  }
  $el.classList.add(...className)
}

export const removeClass = ($el: HTMLElement, className: string): void => {
  $el.classList.remove(className);
};

export const removeAllClass = ($el: HTMLElement): void => {
  $el.className = '';
};

export const hasClass = ($el: HTMLElement, className: string): boolean => $el.classList.contains(className);
