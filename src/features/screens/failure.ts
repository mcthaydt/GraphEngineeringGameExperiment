import { mount, unmount } from 'svelte';
import Failure from './Failure.svelte';

/** Replaces the page with a plain "will not open" message and a button to try again. Returns how to take it down. */
export function showStartFailure(target: HTMLElement, tryAgain: () => void = () => location.reload()): () => void {
  target.replaceChildren();
  const screen = mount(Failure, { target, props: { onTryAgain: tryAgain } });
  return () => void unmount(screen);
}
