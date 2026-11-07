// In-page driver for headless checks: steers the player's vehicle along a path the way a keyboard
// does (steer -1/0/1, throttle on or off), once per frame, through window.__input. Load it with
// shoot.mjs `evalfile:scripts/drive.js` (dev server; GPU=1 so frames come at 60 fps), then:
//   window.__qa.lap(220)          one lap from where the car stands, 220 points along the track
//   window.__qa.path([[x, z], ...]) any route
//   window.__qa.speed = 22; window.__qa.look = 9   target speed (m/s) and look-ahead (m)
//   window.__qa.stop()
// and read window.__qa: i (points passed) of pts.length, done, maxSpeed, air (frames off the
// ground), stuckAt (where it stood still for 60 frames with the throttle on), log ([x, z, i, steer]).
// Set window.__realtime = true first for real 60 fps physics steps.
(() => {
  const T = window.__track, c = window.__car, I = window.__input;
  if (window.__qa) window.__qa.dead = true;
  const st = { mode: "idle", pts: null, i: 0, look: 9, speed: 22, maxSpeed: 0, air: 0, ticks: 0, log: [], stuckAt: [], done: false };
  window.__qa = st;
  st.lap = (n = 220, from) => {
    const t0 = from ?? T.nearestT3(c.pos.x, c.pos.y, c.pos.z);
    st.pts = [];
    for (let k = 1; k <= n; k++) {
      const q = T.trackPoint(t0 + k / n);
      st.pts.push([q.x, q.z]);
    }
    st.i = 0;
    st.mode = "path";
    st.done = false;
  };
  st.path = (pts) => {
    st.pts = pts;
    st.i = 0;
    st.mode = "path";
    st.done = false;
  };
  st.stop = () => {
    st.mode = "idle";
    I.forward = 0;
    I.back = 0;
    I.steer = 0;
  };
  let lastPos = null;
  let still = 0;
  const tick = () => {
    if (st.dead) return;
    requestAnimationFrame(tick);
    try {
      st.ticks++;
      const p = c.pos;
      const sp = Math.abs(c.speed);
      st.maxSpeed = Math.max(st.maxSpeed, sp);
      if (!c.grounded) st.air++;
      if (st.mode !== "path") return;
      if (!st.pts) return;
      // past the points within reach, and any the car has already gone by
      const ahead = (q) => (q[0] - p.x) * c.forward.x + (q[1] - p.z) * c.forward.z;
      const pass = (q) => {
        const d = Math.hypot(q[0] - p.x, q[1] - p.z);
        return d < st.look ? true : ahead(q) < 0 && d < 25;
      };
      while (st.i < st.pts.length && pass(st.pts[st.i])) st.i++;
      if (st.log.length < 400) st.log.push([+p.x.toFixed(1), +p.z.toFixed(1), st.i, I.steer]);
      if (st.i >= st.pts.length) {
        st.done = true;
        st.stop();
        return;
      }
      const [tx, tz] = st.pts[st.i];
      const fx = c.forward.x, fz = c.forward.z;
      const fl = Math.hypot(fx, fz) + 1e-6;
      const dx = tx - p.x, dz = tz - p.z;
      const dl = Math.hypot(dx, dz) + 1e-6;
      const dot = (fx * dx + fz * dz) / fl / dl;
      const left = (fz * dx - fx * dz) / fl / dl; // > 0: the target is to the driver's left
      const ang = Math.atan2(left, dot);
      I.steer = Math.abs(ang) < 0.06 ? 0 : ang > 0 ? -1 : 1;
      const want = Math.abs(ang) > 0.5 ? st.speed * 0.4 : st.speed;
      I.forward = sp < want ? 1 : 0;
      I.back = sp > want + 6 ? 1 : 0;
      const moved = lastPos ? Math.hypot(p.x - lastPos[0], p.z - lastPos[1]) : 1;
      if (moved < 0.02 && I.forward) {
        still++;
        if (still === 60) st.stuckAt.push([+p.x.toFixed(1), +p.z.toFixed(1)]);
      } else still = 0;
      lastPos = [p.x, p.z];
    } catch (e) {
      st.err = String(e);
    }
  };
  requestAnimationFrame(tick);
  return "driver ready";
})();
