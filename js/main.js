/* Portfolio Jones Rahimi – 3D-Modelle (three.js, prozedural) und Seitenlogik */
(function () {
  'use strict';
  var T = window.THREE;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bausteine ---------- */
  var C = { body: 0xe6eaf0, dark: 0x1d1d1f, mid: 0x8e8e93, accent: 0xf2a31b,
    lh: 0x0a2472, hawks: 0x0c1a4a, dbRed: 0xec0016, philips: '#0b5ed7' };
  function M(color, o) {
    return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0.15 }, o || {}));
  }
  function accentMat() {
    return M(C.accent, { emissive: C.accent, emissiveIntensity: 0.1, metalness: 0.3, roughness: 0.4 });
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

  /* Schriftzug als Textur auf einer Fläche (o: bg, frame, italic) */
  function label(text, w, h, fg, o) {
    o = o || {};
    var c = document.createElement('canvas'); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w));
    var x = c.getContext('2d'), ch = c.height;
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, 512, ch); }
    if (o.frame) { x.strokeStyle = o.frame; x.lineWidth = ch * 0.1; x.strokeRect(ch * 0.1, ch * 0.1, 512 - ch * 0.2, ch * 0.8); }
    var fs = ch * (o.frame ? 0.62 : 0.78);
    x.font = (o.italic ? 'italic ' : '') + '700 ' + fs + 'px Helvetica, Arial, sans-serif';
    var tw = x.measureText(text).width, max = 512 * (o.frame ? 0.7 : 0.94);
    if (tw > max) { fs *= max / tw; x.font = (o.italic ? 'italic ' : '') + '700 ' + fs + 'px Helvetica, Arial, sans-serif'; }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, ch * 0.53);
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: !o.bg }));
  }
  /* Fläche auf eine Seitenwand setzen: sg = +1 (Seite +Z) oder -1 (Seite -Z) */
  function onSide(m, x, y, z, sg) { m.position.set(x, y, sg * z); if (sg < 0) m.rotation.y = Math.PI; return m; }

  /* ---------- Flugzeug (Lufthansa Technik): A320 in Lufthansa-Farben ---------- */
  function buildPlane() {
    var g = new T.Group();
    var body = M(0xf4f6f9, { roughness: 0.4 }), dark = M(C.dark, { roughness: 0.3 }), acc = accentMat();
    var wingMat = M(0xdfe4ea, { roughness: 0.4, side: T.DoubleSide });
    var blue = M(C.lh, { roughness: 0.4, side: T.DoubleSide });

    var prof = [[0, -3.3], [0.14, -3.2], [0.28, -2.95], [0.38, -2.6], [0.44, -2.1], [0.44, 1.3],
      [0.36, 2.2], [0.22, 2.9], [0.08, 3.3], [0, 3.32]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var fus = new T.Mesh(new T.LatheGeometry(prof, 40), body);
    fus.rotation.z = Math.PI / 2; // Nase zeigt nach +X
    g.add(fus);
    var tailProf = [[0.382, 2.0], [0.364, 2.2], [0.224, 2.9], [0.084, 3.3], [0, 3.325]]
      .map(function (p) { return new T.Vector2(p[0], p[1]); });
    var tail = new T.Mesh(new T.LatheGeometry(tailProf, 40), blue); // blaues Heck
    tail.rotation.z = Math.PI / 2; g.add(tail);
    g.add(box(3.6, 0.045, 0.9, dark, 0.2, 0.12, 0));  // Fensterband
    [1, -1].forEach(function (sg) {                    // Schriftzug, an den Rumpf angelegt
      var h = new T.Group(); h.rotation.x = -sg * 0.62;
      h.add(onSide(label('Lufthansa Technik', 1.5, 0.15, '#0a2472'), 1.25, 0, 0.447, sg)); g.add(h);
    });
    g.add(box(0.3, 0.1, 0.6, dark, 2.75, 0.17, 0));   // Cockpit

    function surface(pts, depth, y, dihedral) {
      var geo = flat(pts, depth); geo.rotateX(Math.PI / 2);
      var r = new T.Mesh(geo, wingMat); r.position.y = y; r.rotation.x = -dihedral;
      var l = new T.Mesh(geo, wingMat); l.position.y = y; l.scale.z = -1; l.rotation.x = dihedral;
      g.add(r, l);
      return [r, l];
    }
    var sharklet = flat([[-1.0, -0.04], [-1.45, -0.04], [-1.78, 0.5], [-1.58, 0.5]], 0.04);
    sharklet.translate(0, 0, 3.47);
    surface([[1.0, 0], [-0.5, 0], [-1.45, 3.5], [-1.0, 3.5]], 0.07, -0.12, 0.07)
      .forEach(function (w) { w.add(new T.Mesh(sharklet, blue)); });
    surface([[-2.3, 0], [-3.0, 0], [-3.3, 1.35], [-2.95, 1.35]], 0.05, 0.12, 0.03);
    var fin = flat([[-2.1, 0.3], [-3.15, 0.3], [-3.5, 1.6], [-3.1, 1.6]], 0.07);
    fin.translate(0, 0, -0.035);
    g.add(new T.Mesh(fin, blue));
    [0.042, -0.042].forEach(function (z) {             // heller Ring am Leitwerk
      g.add(at(new T.Mesh(new T.RingGeometry(0.15, 0.2, 40),
        new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide })), -3.0, 1.03, z));
    });

    var fans = [];
    [1.3, -1.3].forEach(function (z) {
      var e = at(new T.Group(), 0.45, -0.5, z);
      var nac = cyl(0.27, 0.21, 0.95, body); nac.rotation.z = -Math.PI / 2; e.add(nac);
      var lip = new T.Mesh(new T.TorusGeometry(0.262, 0.03, 12, 40), acc); // Einlauf hervorgehoben
      lip.rotation.y = Math.PI / 2; lip.position.x = 0.46; e.add(lip);
      var intake = cyl(0.225, 0.225, 0.02, dark, 0.475, 0, 0); intake.rotation.z = -Math.PI / 2; e.add(intake);
      var fan = at(new T.Group(), 0.49, 0, 0);
      for (var i = 0; i < 12; i++) {
        var p = new T.Group(); p.rotation.x = (i / 12) * Math.PI * 2;
        p.add(box(0.015, 0.17, 0.035, M(C.mid), 0, 0.12, 0)); fan.add(p);
      }
      var spinner = new T.Mesh(new T.ConeGeometry(0.06, 0.16, 16), M(C.body));
      spinner.rotation.z = -Math.PI / 2; spinner.position.x = 0.06; fan.add(spinner);
      e.add(fan); fans.push(fan);
      var ex = new T.Mesh(new T.ConeGeometry(0.13, 0.36, 20), acc);
      ex.rotation.z = Math.PI / 2; ex.position.x = -0.6; e.add(ex);
      e.add(box(0.55, 0.2, 0.06, body, -0.1, 0.3, 0)); // Pylon
      g.add(e);
    });
    g.userData.tick = function (t, dt) {
      fans.forEach(function (f) { f.rotation.x += dt * 9; });
      g.rotation.z = Math.sin(t * 0.6) * 0.03;
    };
    return g;
  }

  /* ---------- Röntgenstrahler: Röhre im Strahlenschutzgehäuse (Philips) ---------- */
  function buildTube() {
    var g = new T.Group(), PI = Math.PI;
    var white = M(0xf1f2f4, { roughness: 0.4 }), dark = M(C.dark, { roughness: 0.45 }), acc = accentMat();
    var metal = M(0x9a9da3, { metalness: 0.8, roughness: 0.3 }), copper = M(0xb87333, { metalness: 0.7, roughness: 0.35 });
    var shell = new T.MeshStandardMaterial({ color: 0xd5dde6, transparent: true, opacity: 0.2, roughness: 0.15,
      metalness: 0.1, depthWrite: false, side: T.DoubleSide });
    var glass = new T.MeshStandardMaterial({ color: 0xb5cfe2, transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
    function xc(rt, rb, h, mat, x) { var m = cyl(rt, rb, h, mat, x, 0, 0, 48); m.rotation.z = -PI / 2; return m; } // Achse entlang X

    var housing = xc(0.62, 0.62, 1.9, shell, 0); housing.renderOrder = 2; g.add(housing);
    g.add(xc(0.5, 0.62, 0.4, white, 1.15)); g.add(xc(0.62, 0.5, 0.4, white, -1.15));   // Endkappen
    g.add(xc(0.42, 0.42, 0.06, metal, 1.38)); g.add(xc(0.42, 0.42, 0.06, metal, -1.38));
    g.add(xc(0.645, 0.645, 0.1, white, 0.78)); g.add(xc(0.645, 0.645, 0.1, white, -0.78));
    [1, -1].forEach(function (sg) {                                                       // Hochspannungsanschlüsse
      var hv = at(new T.Group(), sg * 0.78, 0.52, 0); hv.rotation.z = -sg * 0.4;
      hv.add(cyl(0.17, 0.2, 0.5, white, 0, 0.25, 0)); hv.add(cyl(0.09, 0.09, 0.36, dark, 0, 0.62, 0, 20)); g.add(hv);
      g.add(box(0.8, 0.2, 0.02, white, 0, 0.06, sg * 0.625));                              // Typenschild
      g.add(onSide(label('PHILIPS', 0.62, 0.13, C.philips), 0, 0.06, 0.637, sg));
    });
    g.add(cyl(0.3, 0.3, 0.2, white, 0, -0.68, 0));                                        // Strahlenaustritt
    g.add(box(0.8, 0.08, 0.8, dark, 0, -0.82, 0));

    var tube = xc(0.25, 0.25, 1.5, glass, 0); tube.renderOrder = 1; g.add(tube);          // Röhre
    var bulb = new T.Mesh(new T.SphereGeometry(0.4, 32, 24), glass); bulb.scale.x = 1.15; bulb.renderOrder = 1; g.add(bulb);
    var anode = new T.Group();
    var disc = cyl(0.2, 0.33, 0.09, metal, 0.08, 0, 0, 48); disc.rotation.z = PI / 2; anode.add(disc);
    var rim = new T.Mesh(new T.TorusGeometry(0.3, 0.022, 10, 48), acc); rim.rotation.y = PI / 2; rim.position.x = 0.045; anode.add(rim);
    for (var i = 0; i < 6; i++) { var m = box(0.012, 0.2, 0.02, dark, 0.13, 0, 0); var h = new T.Group(); h.rotation.x = i * PI / 3; m.position.y = 0.18; h.add(m); anode.add(h); }
    anode.add(xc(0.11, 0.11, 0.6, copper, 0.45));
    g.add(anode);
    g.add(xc(0.1, 0.1, 0.4, metal, -0.52)); g.add(box(0.14, 0.2, 0.2, metal, -0.28, -0.17, 0)); // Kathode
    g.add(at(new T.Mesh(new T.SphereGeometry(0.035, 12, 10), new T.MeshBasicMaterial({ color: 0xffc04d })), 0.02, -0.27, 0));
    var beam = new T.Mesh(new T.ConeGeometry(0.5, 1.4, 40, 1, true),
      new T.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false }));
    beam.position.set(0.02, -0.97, 0); g.add(beam);
    g.userData.tick = function (t, dt) { anode.rotation.x += dt * 5; beam.material.opacity = 0.16 + 0.06 * Math.sin(t * 3); };
    return g;
  }

  /* ---------- Laborautomation: Analysemodule mit GLP Systems Track (Abbott) ---------- */
  function buildLab() {
    var g = new T.Group(), PI = Math.PI;
    var white = M(0xf3f4f6, { roughness: 0.45 }), dark = M(C.dark, { roughness: 0.4 }), acc = accentMat(), mid = M(C.mid);
    var alu = M(0xc4c8ce, { metalness: 0.65, roughness: 0.35 });
    var hood = new T.MeshStandardMaterial({ color: 0x232a36, transparent: true, opacity: 0.8, roughness: 0.08, metalness: 0.2 });
    var blue = new T.MeshBasicMaterial({ color: 0x009cde });
    [-0.78, 0.78].forEach(function (x) {
      g.add(box(1.52, 0.95, 0.9, white, x, 0.475, 0));          // Unterschrank
      g.add(box(1.52, 0.03, 0.02, blue, x, 0.975, 0.455));      // Statusleiste
      g.add(box(1.2, 0.015, 0.02, mid, x, 0.18, 0.455));
      g.add(cyl(0.3, 0.3, 0.1, white, x - 0.25, 1.03, -0.05));  // Karussell unter der Haube
      g.add(box(0.5, 0.04, 0.06, mid, x + 0.25, 1.35, -0.05)); g.add(cyl(0.02, 0.02, 0.3, mid, x + 0.45, 1.2, -0.05, 10));
      var h = box(1.46, 0.62, 0.8, hood, x, 1.29, -0.03); h.renderOrder = 1; g.add(h);
      g.add(box(1.52, 0.07, 0.9, white, x, 1.635, 0));
    });
    g.add(at(label('Abbott', 0.46, 0.12, '#009cde'), -1.2, 0.72, 0.452));
    var scr = at(new T.Group(), 1.82, 1.3, 0.5); scr.rotation.y = -0.45;
    scr.add(box(0.5, 0.34, 0.03, dark)); scr.add(box(0.44, 0.28, 0.004, new T.MeshBasicMaterial({ color: 0x2f7fc1 }), 0, 0, 0.018));
    g.add(scr); g.add(rod(new T.Vector3(1.54, 1.05, 0.3), new T.Vector3(1.8, 1.2, 0.48), 0.02, mid));

    var L = 2.5, R = 0.3, W = 0.11, Y = 0.82, Z = 0.95;
    function stadium(s, r) {
      s.moveTo(-L / 2, -r); s.lineTo(L / 2, -r); s.absarc(L / 2, 0, r, -PI / 2, PI / 2, false);
      s.lineTo(-L / 2, r); s.absarc(-L / 2, 0, r, PI / 2, PI * 1.5, false);
    }
    var sh = new T.Shape(); stadium(sh, R + W);
    var hole = new T.Path(); stadium(hole, R - W); sh.holes.push(hole);
    var geo = new T.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-PI / 2);
    g.add(at(new T.Mesh(geo, alu), 0, Y - 0.07, Z));
    [-1.1, 0, 1.1].forEach(function (x) { g.add(box(0.1, 0.05, 0.3, alu, x, Y - 0.1, 0.58)); }); // Halter am Modul

    var P = 2 * L + 2 * PI * R;
    function pos(d) {
      d = ((d % P) + P) % P;
      if (d < L) return [-L / 2 + d, -R];
      if (d < L + PI * R) { var a = (d - L) / R; return [L / 2 + R * Math.sin(a), -R * Math.cos(a)]; }
      if (d < 2 * L + PI * R) return [L / 2 - (d - L - PI * R), R];
      var b = (d - 2 * L - PI * R) / R; return [-L / 2 - R * Math.sin(b), R * Math.cos(b)];
    }
    var glass = M(0xdfe9f5, { transparent: true, opacity: 0.5, roughness: 0.1 });
    var carriers = [];
    for (var i = 0; i < 7; i++) {
      var c = new T.Group();
      c.add(cyl(0.085, 0.085, 0.07, white, 0, 0.035, 0));
      c.add(cyl(0.024, 0.024, 0.14, M(0xc9584f), 0, 0.14, 0, 12));
      c.add(cyl(0.032, 0.032, 0.3, glass, 0, 0.22, 0, 16));
      c.add(cyl(0.04, 0.04, 0.05, i % 3 ? mid : acc, 0, 0.39, 0, 16));
      c.userData.d = (i / 7) * P; g.add(c); carriers.push(c);
    }
    g.userData.tick = function (t) {
      carriers.forEach(function (c) { var p = pos(c.userData.d + t * 0.45); c.position.set(p[0], Y, Z + p[1]); });
    };
    g.userData.tick(0);
    return g;
  }

  /* ---------- Zug auf Gleis (DB InfraGO) ---------- */
  function buildTrain() {
    var g = new T.Group(), PI = Math.PI;
    var skin = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 });
    var dark = M(C.dark, { roughness: 0.5 }), mid = M(C.mid), acc = accentMat();
    var W = 0.31, H = 0.74, Rr = 0.16, NL = 1.3;
    var ys = [0.085, 0.09, 0.15, 0.155, 0.33, 0.335, 0.5, 0.505]; // Kanten für Zierstreifen und Fensterband
    function carGeo(L, nose) {
      var s = new T.Shape();
      s.moveTo(-W, 0); s.lineTo(W, 0);
      ys.forEach(function (y) { s.lineTo(W, y); });
      s.lineTo(W, H - Rr); s.absarc(W - Rr, H - Rr, Rr, 0, PI / 2, false);
      s.lineTo(-W + Rr, H); s.absarc(-W + Rr, H - Rr, Rr, PI / 2, PI, false);
      ys.slice().reverse().forEach(function (y) { s.lineTo(-W, y); });
      var geo = new T.ExtrudeGeometry(s, { depth: L, steps: Math.round(L / 0.05), bevelEnabled: false, curveSegments: 8 });
      geo.rotateY(PI / 2); // Länge entlang +X
      var p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), t = nose ? Math.max(0, (x - (L - NL)) / NL) : 0, hex = 0xf4f6f9;
        if (y > 0.088 && y < 0.152) hex = C.dbRed;
        else if (y > 0.333 && y < 0.502 && x > 0.2 && x < L - (nose ? NL + 0.15 : 0.2)) hex = 0x161c28;
        else if (nose && t > 0.3 && t < 0.72 && y > 0.503) hex = 0x161c28; // Frontscheibe
        c.setHex(hex); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        if (t > 0) { p.setY(i, y * (1 - 0.7 * Math.pow(t, 1.9))); p.setZ(i, p.getZ(i) * (1 - 0.5 * Math.pow(t, 2.4))); }
      }
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      return geo;
    }
    var train = at(new T.Group(), 0, 0.26, 0);
    var head = at(new T.Mesh(carGeo(3.4, true), skin), -0.2, 0, 0);
    [1, -1].forEach(function (sg) {
      head.add(onSide(label('DB', 0.21, 0.145, '#ec0016', { bg: '#ffffff', frame: '#ec0016' }), 1.8, 0.242, W + 0.004, sg));
    });
    train.add(head);
    train.add(at(new T.Mesh(carGeo(2.6, false), skin), -2.86, 0, 0));
    train.add(box(0.08, 0.6, 0.5, dark, -0.23, 0.32, 0));     // Übergang
    [0.07, -0.07].forEach(function (z) {                       // Spitzenlicht
      train.add(at(new T.Mesh(new T.SphereGeometry(0.022, 10, 8), new T.MeshBasicMaterial({ color: 0xfff3c4 })), 3.185, 0.1, z));
    });
    g.add(train);
    [2.1, 0.25, -0.75, -2.35].forEach(function (x) {           // Drehgestelle
      g.add(box(0.62, 0.13, 0.5, dark, x, 0.2, 0));
      [0.18, -0.18].forEach(function (dx) {
        var w = cyl(0.1, 0.1, 0.56, mid, x + dx, 0.16, 0, 20); w.rotation.x = PI / 2; g.add(w);
      });
    });
    g.add(box(1.1, 0.09, 0.54, dark, 1.2, 0.22, 0)); g.add(box(0.9, 0.09, 0.54, dark, -1.55, 0.22, 0));

    [0.25, -0.25].forEach(function (z) { g.add(box(7.3, 0.06, 0.045, acc, 0.15, 0.03, z)); }); // Schienen
    for (var x = -3.35; x < 3.7; x += 0.3) g.add(box(0.12, 0.04, 0.82, mid, x, -0.02, 0));     // Schwellen
    g.add(box(7.5, 0.06, 1.2, dark, 0.15, -0.07, 0));                                           // Schotterbett

    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    g.add(rod(V(-3.5, 1.52, 0), V(3.8, 1.52, 0), 0.009, mid)); // Fahrdraht
    [-3.1, 3.4].forEach(function (x) {                          // Oberleitungsmasten
      g.add(box(0.07, 1.8, 0.07, mid, x, 0.82, -0.78));
      g.add(rod(V(x, 1.66, -0.78), V(x, 1.53, 0.02), 0.014, mid));
      g.add(rod(V(x, 1.3, -0.78), V(x, 1.53, -0.25), 0.012, mid));
    });
    g.add(rod(V(-1.75, 1.0, 0), V(-1.45, 1.24, 0), 0.014, dark)); // Stromabnehmer
    g.add(rod(V(-1.45, 1.24, 0), V(-1.68, 1.49, 0), 0.014, dark));
    g.add(box(0.05, 0.025, 0.42, dark, -1.68, 1.495, 0));
    return g;
  }

  /* ---------- Formula-Student-Rennwagen (HAWKS Racing) ---------- */
  function buildCar() {
    var g = new T.Group();
    var body = M(C.hawks, { roughness: 0.3, metalness: 0.3 }), white = M(0xf4f6f9, { roughness: 0.35 });
    var dark = M(0x10141d, { roughness: 0.6 }), mid = M(C.mid), acc = accentMat();
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
    g.add(at(new T.Mesh(new T.SphereGeometry(0.14, 20, 16), white), 0.05, 0.52, 0)); // Helm
    var stripe = box(1.06, 0.02, 0.1, white, 1.48, 0.4, 0); stripe.rotation.z = -0.207; g.add(stripe); // Nasenstreifen
    g.add(box(0.14, 0.2, 0.3, white, 2.0, 0.2, 0));
    var hoop = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 8, 24, Math.PI), dark);
    hoop.rotation.y = Math.PI / 2; hoop.position.set(-0.3, 0.68, 0); g.add(hoop);
    [1, -1].forEach(function (sg) {
      g.add(box(0.95, 0.24, 0.26, body, -0.45, 0.27, sg * 0.44));
      var st = box(0.8, 0.045, 0.012, white, -0.45, 0.25, sg * 0.572); st.rotation.z = 0.16; g.add(st);
      var st2 = box(0.5, 0.03, 0.012, white, -0.5, 0.19, sg * 0.572); st2.rotation.z = 0.16; g.add(st2);
      g.add(onSide(label('HAWKS', 0.5, 0.14, '#ffffff', { italic: true }), -1.6, 0.97, 0.648, sg));
      g.add(onSide(label('69', 0.26, 0.17, '#ffffff'), -1.6, 0.8, 0.648, sg));
      g.add(onSide(label('HAWKS', 0.38, 0.1, '#ffffff', { italic: true }), 2.05, 0.19, 0.818, sg));
    });

    g.add(box(0.4, 0.04, 1.6, dark, 2.05, 0.1, 0));           // Frontflügel
    [0.8, -0.8].forEach(function (z) { g.add(box(0.44, 0.22, 0.03, dark, 2.05, 0.17, z)); });
    g.add(box(0.45, 0.04, 1.25, dark, -1.55, 0.92, 0));       // Heckflügel
    var flap = box(0.3, 0.04, 1.25, dark, -1.74, 1.03, 0); flap.rotation.z = -0.35; g.add(flap);
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
  var stages = [], shTex;
  function shadowTex() {
    if (shTex) return shTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(0.55, 'rgba(0,0,0,.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return (shTex = new T.CanvasTexture(c));
  }
  function mount(el, build, opt) {
    var canvas = el.querySelector('canvas');
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(32, 1, 0.1, 100);
    cam.position.set(0, 2.2, 10.8); cam.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0xb4b9c2, 0.78));
    var key = new T.DirectionalLight(0xffffff, 0.7); key.position.set(4, 7, 6); scene.add(key);
    var rim = new T.DirectionalLight(0xffffff, 0.3); rim.position.set(-6, 2, -5); scene.add(rim);

    var pivot = new T.Group(); scene.add(pivot);
    var model = build();
    var bb = new T.Box3().setFromObject(model), size = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3());
    var sc = (opt.fit || 5.2) / Math.max(size.x, size.z, size.y * 1.4);
    var holder = new T.Group(); holder.scale.setScalar(sc);
    var baseY = -ctr.y * sc + 0.2;
    holder.position.set(-ctr.x * sc, baseY, -ctr.z * sc);
    holder.add(model); pivot.add(holder);
    var shadow = new T.Mesh(new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity: 0.55, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = -1;
    shadow.scale.set(size.x * sc * 1.3, size.z * sc * 1.3, 1);
    shadow.position.y = Math.max(-2.3, -size.y * sc / 2 - 0.45); pivot.add(shadow); // weicher Schatten statt Bodenraster

    var st = { el: el, renderer: renderer, scene: scene, cam: cam, model: model, pivot: pivot,
      holder: holder, baseY: baseY, phase: stages.length * 1.7, yaw: opt.yaw || 0.6, pitch: 0.14, drag: false, last: -1e9, visible: false, w: 0, h: 0 };
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
    var builders = { plane: [buildPlane, { yaw: -0.7 }], tube: [buildTube, { yaw: 0.3, fit: 6.4 }],
      train: [buildTrain, { yaw: -0.6, fit: 5.6 }], lab: [buildLab, { yaw: -0.55, fit: 4.3 }],
      car: [buildCar, { yaw: -0.65, fit: 5.3 }] };
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
        if (!reduceMotion) s.holder.position.y = s.baseY + Math.sin(now / 1000 * 0.9 + s.phase) * 0.07;
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

    function onScroll() { document.body.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    var root = document.documentElement, langBtns = document.querySelectorAll('.lang-sw button');
    var titles = { de: 'Jones Rahimi – Maschinenbauingenieur', en: 'Jones Rahimi – Mechanical Engineer' };
    function setLang(l, save) {
      root.lang = l; document.title = titles[l];
      langBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
      if (save) { try { localStorage.setItem('lang', l); } catch (e) {} }
    }
    setLang(root.lang === 'en' ? 'en' : 'de');
    langBtns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang, true); }); });

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
