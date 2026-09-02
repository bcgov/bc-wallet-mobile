import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

const { errorModal } = TestIds

/**
 * The app's error modal (`BCSCErrorModal` → `ErrorInfoCard`) — an overlay any screen can raise, and
 * the reason a screen that looks stuck often is: whatever the journey was waiting for will never
 * arrive while this is up.
 *
 * `self`/`primary` is the close button, the only control that always renders. Anchoring on it also
 * keeps the descriptor honest: the title/body ids are bifold-generic and match other cards, so the
 * modal's contents are reported with a screen dump rather than read through them.
 *
 * The two platforms disagree on what is visible UNDER it — iOS drops the covered screen out of the
 * accessibility tree, Android keeps it in a second window — so a journey that does not probe for this
 * fails differently on each: iOS times out waiting for a screen that is right there, Android keeps
 * driving controls nothing is listening to.
 */
export const AppErrorModal = defineScreen({
  self: bcsc(errorModal.close),
  primary: bcsc(errorModal.close),
  elements: {
    showDetails: bcsc(errorModal.showDetails),
  },
})
