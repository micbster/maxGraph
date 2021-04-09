/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import mxEventSource from '../event/mxEventSource';
import mxEventObject from '../event/mxEventObject';
import mxEvent from '../event/mxEvent';

/**
 * Implements a basic animation in JavaScript.
 *
 * @class mxAnimation
 * @extends {mxEventSource}
 */
class mxAnimation extends mxEventSource {
  constructor(delay) {
    super();
    this.delay = delay != null ? delay : 20;
  }

  /**
   * Specifies the delay between the animation steps. Defaul is 30ms.
   */
  // delay: number;
  delay = null;

  /**
   * Reference to the thread while the animation is running.
   */
  // thread: number;
  thread = null;

  /**
   * Returns true if the animation is running.
   */
  // isRunning(): boolean;
  isRunning() {
    return this.thread != null;
  }

  /**
   * Starts the animation by repeatedly invoking updateAnimation.
   */
  // startAnimation(): void;
  startAnimation() {
    if (this.thread == null) {
      this.thread = window.setInterval(
        this.updateAnimation.bind(this),
        this.delay
      );
    }
  }

  /**
   * Hook for subclassers to implement the animation. Invoke stopAnimation
   * when finished, startAnimation to resume. This is called whenever the
   * timer fires and fires an mxEvent.EXECUTE event with no properties.
   */
  // updateAnimation(): void;
  updateAnimation() {
    this.fireEvent(new mxEventObject(mxEvent.EXECUTE));
  }

  /**
   * Stops the animation by deleting the timer and fires an <mxEvent.DONE>.
   */
  // stopAnimation(): void;
  stopAnimation() {
    if (this.thread != null) {
      window.clearInterval(this.thread);
      this.thread = null;
      this.fireEvent(new mxEventObject(mxEvent.DONE));
    }
  }
}

export default mxAnimation;
