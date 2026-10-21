type Listener = () => void;

export const playback = {
  time: 1.15,
  playing: false,
  listeners: new Set<Listener>(),
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },
  setTime(t: number) {
    this.time = Math.max(0, t);
    for (const fn of this.listeners) fn();
  },
};
