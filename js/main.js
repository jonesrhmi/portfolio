/* Portfolio Jones Rahimi – 3D-Modelle (three.js, prozedural) und Seitenlogik */
(function () {
  'use strict';
  var T = window.THREE;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bausteine ---------- */
  var C = { body: 0xe6eaf0, dark: 0x1a2130, mid: 0x8a94a6, accent: 0xf5b042 };
  function M(color, o) {
    return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0.15 }, o || {}));
  }
  function accentMat() {
    return M(C.accent, { emissive: C.accent, emissiveIntensity: 0.28, metalness: 0.35, roughness: 0.35 });
  }
  function at(m, x, y, z) { m.position.set(x || 0, y || 0, z || 0); return m; }
  function box(w, h, d, mat, x, y, z) { return at(new T.Mesh(new T.BoxGeometry(w, h, d), mat), x, y, z); }
  function cyl(rt, rb, h, mat, x, y, z, seg) {
    return at(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 32), mat), x, y, z);
  }
  function rod(a, b, r, mat) {
    var d = new T.Vector3().subVectors(b, a);
    var m = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 10), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    return m;
  }
  function flat(pts, depth) {
    var s = new T.Shape();
    pts.forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
    return new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false });
  }

  /* ---------- Flugzeug (Lufthansa Technik) ---------- */
  function buildPlane() {
    var g = new T.Group();
    var body = M(C.body, { roughness: 0.4 }), dark = M(C.dark, { roughness: 0.3 }), acc = accentMat();
    var wingMat = M(C.body, { roughness: 0.4, side: T.DoubleSide });

    var prof = [[0, -3.3], [0.14, -3.2], [0.28, -2.95], [0.38, -2.6], [0.44, -2.1], [0.44, 1.3],
      [0.36, 2.2], [0.22, 2.9], [0.08, 3.3], [0, 3.32]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var fus = new T.Mesh(new T.LatheGeometry(prof, 40), body);
    fus.rotation.z = Math.PI / 2; // Nase zeigt nach +X
    g.add(fus);
    g.add(box(3.2, 0.06, 0.9, dark, 0.4, 0.12, 0));   // Fensterband
    g.add(box(0.3, 0.1, 0.6, dark, 2.75, 0.17, 0));   // Cockpit

    function surface(pts, depth, y, dihedral) {
      var geo = flat(pts, depth); geo.rotateX(Math.PI / 2);
      var r = new T.Mesh(geo, wingMat); r.position.y = y; r.rotation.x = -dihedral;
      var l = new T.Mesh(geo, wingMat); l.position.y = y; l.scale.z = -1; l.rotation.x = dihedral;
      g.add(r, l);
    }
    surface([[1.0, 0], [-0.5, 0], [-1.45, 3.5], [-1.0, 3.5]], 0.07, -0.12, 0.07);
    surface([[-2.3, 0], [-3.0, 0], [-3.3, 1.35], [-2.95, 1.35]], 0.05, 0.12, 0.03);
    var fin = flat([[-2.1, 0.3], [-3.15, 0.3], [-3.5, 1.6], [-3.1, 1.6]], 0.07);
    fin.translate(0, 0, -0.035);
    g.add(new T.Mesh(fin, body));

    var fans = [];
    [1.3, -1.3].forEach(function (z) {
      var e = at(new T.Group(), 0.45, -0.5, z);
      var nac = cyl(0.27, 0.21, 0.95, acc); nac.rotation.z = -Math.PI / 2; e.add(nac);
      var intake = cyl(0.225, 0.225, 0.02, dark, 0.475, 0, 0); intake.rotation.z = -Math.PI / 2; e.add(intake);
      var fan = at(new T.Group(), 0.49, 0, 0);
      for (var i = 0; i < 12; i++) {
        var p = new T.Group(); p.rotation.x = (i / 12) * Math.PI * 2;
        p.add(box(0.015, 0.17, 0.035, M(C.mid), 0, 0.12, 0)); fan.add(p);
      }
      var spinner = new T.Mesh(new T.ConeGeometry(0.06, 0.16, 16), M(C.body));
      spinner.rotation.z = -Math.PI / 2; spinner.position.x = 0.06; fan.add(spinner);
      e.add(fan); fans.push(fan);
      var ex = new T.Mesh(new T.ConeGeometry(0.13, 0.36, 20), dark);
      ex.rotation.z = Math.PI / 2; ex.position.x = -0.6; e.add(ex);
      e.add(box(0.55, 0.2, 0.06, body, -0.1, 0.3, 0)); // Pylon
      g.add(e);
    });
    g.userData.tick = function (t, dt) {
      fans.forEach(function (f) { f.rotation.x += dt * 9; });
      g.position.y = Math.sin(t * 0.9) * 0.08; g.rotation.z = Math.sin(t * 0.6) * 0.03;
    };
    return g;
  }

  /* ---------- Röntgen-C-Bogen (Philips) ---------- */
  function buildXray() {
    var g = new T.Group();
    var body = M(C.body, { roughness: 0.45 }), dark = M(C.dark), acc = accentMat();
    g.add(box(1.3, 0.22, 1.1, dark, -1.75, 0.2, 0));
    [[-2.3, 0.45], [-2.3, -0.45], [-1.2, 0.45], [-1.2, -0.45]].forEach(function (p) {
      var w = cyl(0.09, 0.09, 0.08, M(C.mid), p[0], 0.09, p[1]); w.rotation.x = Math.PI / 2; g.add(w);
    });
    g.add(box(0.34, 1.9, 0.34, body, -1.9, 1.25, 0));
    g.add(box(0.75, 0.24, 0.28, body, -1.5, 1.6, 0));

    var R = 1.1, arm = at(new T.Group(), 0, 1.6, 0);
    var arc = new T.Mesh(new T.TorusGeometry(R, 0.085, 14, 64, Math.PI * 1.2), body);
    arc.rotation.z = Math.PI * 0.4; arm.add(arc);
    arm.add(cyl(0.32, 0.32, 0.12, body, 0.34, 1.0, 0));       // Detektor
    arm.add(cyl(0.27, 0.27, 0.02, dark, 0.34, 0.93, 0));
    var tube = cyl(0.2, 0.2, 0.46, acc, 0.34, -1.0, 0); tube.rotation.x = Math.PI / 2; arm.add(tube); // Röntgenstrahler
    arm.add(box(0.22, 0.16, 0.22, dark, 0.34, -0.8, 0));      // Blende
    var beam = new T.Mesh(new T.ConeGeometry(0.27, 1.64, 40, 1, true),
      new T.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }));
    beam.rotation.x = Math.PI; beam.position.set(0.34, 0.1, 0); arm.add(beam);
    g.add(arm);

    g.add(box(0.75, 0.07, 2.9, body, 0.34, 1.62, 0.3));       // Patientenliege
    g.add(box(0.6, 0.03, 2.0, dark, 0.34, 1.67, 0.1));
    g.add(box(0.4, 1.5, 0.5, dark, 0.34, 0.83, 1.45));
    g.add(box(0.85, 0.1, 0.95, dark, 0.34, 0.05, 1.45));

    g.userData.tick = function (t) {
      arm.rotation.x = Math.sin(t * 0.55) * 0.32;
      beam.material.opacity = 0.13 + 0.06 * Math.sin(t * 3);
    };
    return g;
  }

  /* ---------- Probentransport-Track (Abbott) ---------- */
  function buildTrack() {
    var g = new T.Group();
    var body = M(C.body), dark = M(C.dark, { roughness: 0.4 }), acc = accentMat();
    var L = 2.6, R = 0.85, W = 0.2, PI = Math.PI;
    function stadium(s, r) {
      s.moveTo(-L / 2, -r); s.lineTo(L / 2, -r); s.absarc(L / 2, 0, r, -PI / 2, PI / 2, false);
      s.lineTo(-L / 2, r); s.absarc(-L / 2, 0, r, PI / 2, PI * 1.5, false);
    }
    var sh = new T.Shape(); stadium(sh, R + W);
    var hole = new T.Path(); stadium(hole, R - W); sh.holes.push(hole);
    var geo = new T.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-PI / 2);
    g.add(new T.Mesh(geo, dark));
    g.add(box(L + 2 * R + 1.0, 0.14, 2 * R + 1.9, body, 0, -0.07, -0.45));
    [[-2.3, 0.9], [2.3, 0.9], [-2.3, -1.8], [2.3, -1.8]].forEach(function (p) {
      g.add(box(0.12, 0.9, 0.12, M(C.mid), p[0], -0.59, p[1]));
    });
    g.add(box(1.7, 1.0, 0.7, body, 0, 0.5, -R - 0.85));      // Analysemodul
    g.add(box(1.25, 0.42, 0.02, dark, 0, 0.62, -R - 0.49));
    g.add(box(1.25, 0.04, 0.03, acc, 0, 0.3, -R - 0.49));

    var P = 2 * L + 2 * PI * R;
    function pos(d) {
      d = ((d % P) + P) % P;
      if (d < L) return [-L / 2 + d, -R];
      if (d < L + PI * R) { var a = (d - L) / R; return [L / 2 + R * Math.sin(a), -R * Math.cos(a)]; }
      if (d < 2 * L + PI * R) return [L / 2 - (d - L - PI * R), R];
      var b = (d - 2 * L - PI * R) / R; return [-L / 2 - R * Math.sin(b), R * Math.cos(b)];
    }
    var glass = M(0xdfe9f5, { transparent: true, opacity: 0.45, roughness: 0.1 });
    var carriers = [];
    for (var i = 0; i < 8; i++) {
      var c = new T.Group();
      c.add(cyl(0.12, 0.12, 0.07, body, 0, 0.135, 0));
      c.add(cyl(0.035, 0.035, 0.2, M(0xc9584f), 0, 0.29, 0, 12));
      c.add(cyl(0.048, 0.048, 0.42, glass, 0, 0.38, 0, 16));
      c.add(cyl(0.058, 0.058, 0.07, i % 3 ? M(C.mid) : acc, 0, 0.62, 0, 16));
      c.userData.d = (i / 8) * P; g.add(c); carriers.push(c);
    }
    g.userData.tick = function (t) {
      carriers.forEach(function (c) { var p = pos(c.userData.d + t * 0.55); c.position.set(p[0], 0, p[1]); });
    };
    g.userData.tick(0);
    return g;
  }

  /* ---------- Formula-Student-Rennwagen (HAWKS Racing) ---------- */
  function buildCar() {
    var g = new T.Group();
    var body = M(C.body, { roughness: 0.35 }), dark = M(C.dark, { roughness: 0.7 }), mid = M(C.mid), acc = accentMat();
    var s = new T.Shape();
    [[2.0, 0.14], [2.0, 0.24], [0.95, 0.46], [0.5, 0.46], [0.42, 0.36], [-0.12, 0.36], [-0.2, 0.66],
      [-0.38, 0.7], [-1.3, 0.42], [-1.55, 0.3], [-1.55, 0.14]].forEach(function (p, i) {
      if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]);
    });
    var geo = new T.ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    geo.translate(0, 0, -0.31);
    var pa = geo.attributes.position;
    for (var i = 0; i < pa.count; i++) {
      var x = pa.getX(i), f = 1;
      if (x > 0.9) f = 1 - 0.62 * Math.min(1, (x - 0.9) / 1.1);
      else if (x < -1.0) f = 1 - 0.35 * Math.min(1, (-1.0 - x) / 0.55);
      pa.setZ(i, pa.getZ(i) * f);
    }
    geo.computeVertexNormals();
    g.add(new T.Mesh(geo, body));
    g.add(at(new T.Mesh(new T.SphereGeometry(0.14, 20, 16), mid), 0.05, 0.52, 0)); // Helm
    var hoop = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 8, 24, Math.PI), dark);
    hoop.rotation.y = Math.PI / 2; hoop.position.set(-0.3, 0.68, 0); g.add(hoop);
    [0.44, -0.44].forEach(function (z) { g.add(box(0.95, 0.24, 0.26, body, -0.45, 0.27, z)); });

    g.add(box(0.4, 0.04, 1.6, body, 2.05, 0.1, 0));           // Frontflügel
    [0.8, -0.8].forEach(function (z) { g.add(box(0.44, 0.22, 0.03, dark, 2.05, 0.17, z)); });
    g.add(box(0.45, 0.04, 1.25, body, -1.55, 0.92, 0));       // Heckflügel
    var flap = box(0.3, 0.04, 1.25, body, -1.74, 1.03, 0); flap.rotation.z = -0.35; g.add(flap);
    [0.63, -0.63].forEach(function (z) { g.add(box(0.62, 0.44, 0.03, dark, -1.6, 0.9, z)); });
    [0.2, -0.2].forEach(function (z) { g.add(box(0.06, 0.5, 0.06, dark, -1.45, 0.64, z)); });

    var wheels = [];
    [[1.15, 0.74], [1.15, -0.74], [-1.05, 0.74], [-1.05, -0.74]].forEach(function (p) {
      var x = p[0], z = p[1], sg = z > 0 ? 1 : -1;
      var w = at(new T.Group(), x, 0.33, z);
      var tire = cyl(0.33, 0.33, 0.26, dark); tire.rotation.x = Math.PI / 2; w.add(tire);
      for (var k = 0; k < 5; k++) {
        var sp = box(0.4, 0.05, 0.03, mid, 0, 0, sg * 0.125); sp.rotation.z = (k / 5) * Math.PI; w.add(sp);
      }
      var hub = cyl(0.085, 0.085, 0.46, acc, 0, 0, -sg * 0.06, 20); hub.rotation.x = Math.PI / 2; w.add(hub);  // Radnabe
      var flange = cyl(0.15, 0.15, 0.05, acc, 0, 0, sg * 0.15, 24); flange.rotation.x = Math.PI / 2; w.add(flange);
      g.add(w); wheels.push(w);
      [[0.18, 0.2, 0.25], [-0.18, 0.2, 0.25], [0.18, 0.42, 0.42], [-0.18, 0.42, 0.42]].forEach(function (q) {
        g.add(rod(new T.Vector3(x + q[0], q[1], sg * 0.26), new T.Vector3(x, q[2], sg * 0.6), 0.016, dark));
      });
    });
    g.userData.tick = function (t, dt) { wheels.forEach(function (w) { w.rotation.z -= dt * 2.2; }); };
    return g;
  }

  /* ---------- Bühne je Modell ---------- */
  var stages = [];
  function mount(el, build, opt) {
    var canvas = el.querySelector('canvas');
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(32, 1, 0.1, 100);
    cam.position.set(0, 2.2, 10.8); cam.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0x1b2334, 0.95));
    var key = new T.DirectionalLight(0xffffff, 1.05); key.position.set(4, 7, 6); scene.add(key);
    var rim = new T.DirectionalLight(0xf5b042, 0.55); rim.position.set(-6, 2, -5); scene.add(rim);

    var pivot = new T.Group(); scene.add(pivot);
    var model = build();
    var bb = new T.Box3().setFromObject(model), size = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3());
    var sc = (opt.fit || 5.2) / Math.max(size.x, size.z, size.y * 1.4);
    var ground = opt.float ? -1.6 : Math.max(-1.6, -size.y * sc / 2 - 0.35); // flache Modelle höher setzen
    var grid = new T.PolarGridHelper(3.5, 12, 5, 72, 0x3d4a66, 0x283246);
    grid.position.y = ground; grid.material.transparent = true; grid.material.opacity = 0.75; pivot.add(grid);
    var holder = new T.Group(); holder.scale.setScalar(sc);
    holder.position.set(-ctr.x * sc, opt.float ? -ctr.y * sc + 0.1 : ground - bb.min.y * sc, -ctr.z * sc);
    holder.add(model); pivot.add(holder);

    var st = { el: el, renderer: renderer, scene: scene, cam: cam, model: model, pivot: pivot,
      yaw: opt.yaw || 0.6, pitch: 0.14, drag: false, last: -1e9, visible: false, w: 0, h: 0 };
    function size_() {
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h || (w === st.w && h === st.h)) return;
      st.w = w; st.h = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    st.resize = size_; size_();
    if (window.ResizeObserver) new ResizeObserver(size_).observe(el);

    var px = 0, py = 0;
    canvas.addEventListener('pointerdown', function (e) {
      st.drag = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); el.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!st.drag) return;
      st.yaw += (e.clientX - px) * 0.008;
      st.pitch = Math.max(-0.45, Math.min(0.95, st.pitch + (e.clientY - py) * 0.006));
      px = e.clientX; py = e.clientY; st.last = performance.now();
    });
    function end() { st.drag = false; st.last = performance.now(); el.classList.remove('is-dragging'); }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    stages.push(st);
    return st;
  }

  function initStages() {
    if (!T) return;
    var builders = { plane: [buildPlane, { float: true, yaw: -0.7 }], xray: [buildXray, { yaw: 0.75 }],
      track: [buildTrack, { yaw: 0.5, fit: 5.6 }], car: [buildCar, { yaw: -0.65, fit: 5.3 }] };
    document.querySelectorAll('[data-model]').forEach(function (el) {
      var b = builders[el.dataset.model]; if (!b) return;
      try { mount(el, b[0], b[1]); } catch (err) { el.classList.add('no-webgl'); }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        stages.forEach(function (s) { if (s.el === en.target) s.visible = en.isIntersecting; });
      });
    }, { rootMargin: '120px' });
    stages.forEach(function (s) { io.observe(s.el); });

    var prev = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      stages.forEach(function (s) {
        if (!s.visible) return;
        s.resize();
        if (!s.drag && !reduceMotion && now - s.last > 1800) s.yaw += dt * 0.28;
        s.pivot.rotation.set(s.pitch, s.yaw, 0);
        if (s.model.userData.tick && !reduceMotion) s.model.userData.tick(now / 1000, dt);
        s.renderer.render(s.scene, s.cam);
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Seite: Einblenden, Navigation, Fortschritt, PDF-Ansicht ---------- */
  function initPage() {
    var rev = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      rev.forEach(function (r) { ro.observe(r); });
    } else rev.forEach(function (r) { r.classList.add('in'); });

    var links = document.querySelectorAll('.nav a[href^="#"]'), map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || !map[e.target.id]) return;
        links.forEach(function (a) { a.classList.remove('active'); });
        map[e.target.id].classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { so.observe(s); });

    var bar = document.querySelector('.progress');
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
      document.body.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    var dlg = document.getElementById('pdf'), frame = dlg.querySelector('iframe');
    var title = dlg.querySelector('.pdf-title'), ext = dlg.querySelector('.pdf-ext');
    document.querySelectorAll('[data-pdf]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (!dlg.showModal || window.innerWidth < 760) return; // mobil: Link öffnet neuen Tab
        e.preventDefault();
        frame.src = b.getAttribute('href'); title.textContent = b.dataset.pdf; ext.href = b.getAttribute('href');
        dlg.showModal();
      });
    });
    dlg.querySelector('.pdf-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { frame.src = 'about:blank'; });
  }

  document.addEventListener('DOMContentLoaded', function () { initPage(); initStages(); });
})();
