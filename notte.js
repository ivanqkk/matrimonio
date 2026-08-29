/* ============================================================
   Ivan & Greta — modalità notturna

   La mezzaluna in basso a destra spegne il bosco e accende il cielo che c'era
   davvero sopra Toceno la notte del matrimonio: 24 luglio 2027, 23:30, sole
   già a diciotto gradi sotto l'orizzonte.

   Qui dentro non c'è astronomia. I calcoli — precessione, tempo siderale,
   altezza sull'orizzonte — li ha già fatti strumenti-cielo.py, che ha lasciato
   in cielo.js delle coordinate piatte, pronte da moltiplicare per il raggio
   dello schermo. Vuol dire nessuna libreria da scaricare e lo stesso identico
   cielo per tutti, oggi e fra due anni.

   Il sistema di coordinate di cielo.js: lo zenit (il punto sopra la testa) è
   l'origine, l'orizzonte è il cerchio di raggio 1, il nord è in alto e l'est a
   SINISTRA — perché si guarda in su, non in giù su una cartina.
   ============================================================ */

(() => {
  const corpo = document.body;
  const bottone = document.getElementById("luna");
  const tela = document.getElementById("cielo");
  if (!bottone || !tela) return;

  const RICORDO = "ivan-greta:notte";
  const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

  const pennello = tela.getContext("2d");
  let dati = null;            // il contenuto di cielo.js, quando sarà arrivato
  let inCaricamento = false;
  let fondale = null;         // il cielo fermo, disegnato una volta sola
  let scintillanti = [];
  let animazione = null;
  let ultimoRitocco = 0;


  /* ---------- il colore delle stelle ----------
     L'indice B-V dice quanto è calda una stella: negativo azzurro, sopra 1.4
     rosso mattone. È la differenza fra Vega e Antares, e si vede. */

  function tinta(bv) {
    const t = Math.max(-0.3, Math.min(1.8, bv));
    if (t < 0) return [190, 208, 255];
    if (t < 0.3) return [214, 226, 255];
    if (t < 0.6) return [246, 246, 250];
    if (t < 0.9) return [255, 242, 222];
    if (t < 1.3) return [255, 220, 186];
    return [255, 196, 160];
  }

  const raggio = (mag) => Math.max(0.45, 1.95 - 0.30 * mag);
  const forza = (mag) => Math.max(0.30, Math.min(1, 1.06 - 0.13 * mag));


  /* ---------- il disegno ---------- */

  function misura() {
    const l = tela.clientWidth, h = tela.clientHeight;
    // Metà diagonale: così il disco del cielo copre tutto lo schermo e non
    // restano angoli vuoti. In cambio le stelle più basse finiscono fuori
    // quadro, ma sono quelle che in montagna nasconderebbe il crinale.
    return { l, h, cx: l / 2, cy: h / 2, scala: Math.hypot(l, h) / 2 };
  }

  function disegnaFondale({ l, h, cx, cy, scala }) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fondale = document.createElement("canvas");
    fondale.width = Math.round(l * dpr);
    fondale.height = Math.round(h * dpr);
    const p = fondale.getContext("2d");
    p.scale(dpr, dpr);

    const X = (x) => cx + x * scala;
    const Y = (y) => cy + y * scala;

    // le figure delle costellazioni, sotto a tutto: sono un sussurro, non
    // devono competere con le stelle che le compongono
    p.strokeStyle = "rgba(150, 190, 235, .22)";
    p.lineWidth = 1;
    p.beginPath();
    for (const [x1, y1, x2, y2] of dati.linee) {
      p.moveTo(X(x1), Y(y1));
      p.lineTo(X(x2), Y(y2));
    }
    p.stroke();

    // le stelle
    for (const [x, y, mag, bv] of dati.stelle) {
      const sx = X(x), sy = Y(y);
      if (sx < -10 || sx > l + 10 || sy < -10 || sy > h + 10) continue;
      const [r, g, b] = tinta(bv);
      const rr = raggio(mag);

      // alle più luminose un alone, altrimenti Vega e una stellina di quinta
      // grandezza finiscono per somigliarsi
      if (mag < 1.9) {
        const alone = p.createRadialGradient(sx, sy, 0, sx, sy, rr * 6);
        alone.addColorStop(0, `rgba(${r},${g},${b},.30)`);
        alone.addColorStop(1, `rgba(${r},${g},${b},0)`);
        p.fillStyle = alone;
        p.beginPath();
        p.arc(sx, sy, rr * 6, 0, 6.2832);
        p.fill();
      }

      p.fillStyle = `rgba(${r},${g},${b},${forza(mag)})`;
      p.beginPath();
      p.arc(sx, sy, rr, 0, 6.2832);
      p.fill();
    }

    // i nomi: prima le costellazioni, poi le stelle che tutti conoscono
    if (p.letterSpacing !== undefined) p.letterSpacing = "2px";
    p.textAlign = "center";
    p.fillStyle = "rgba(196, 216, 238, .34)";
    p.font = '11px "Fraunces", Georgia, serif';
    for (const c of dati.costellazioni) {
      const sx = X(c.x), sy = Y(c.y);
      if (sx < 40 || sx > l - 40 || sy < 30 || sy > h - 30) continue;
      p.fillText(c.n.toUpperCase(), sx, sy);
    }

    p.fillStyle = "rgba(226, 236, 248, .58)";
    p.font = '12px "Fraunces", Georgia, serif';
    for (const s of dati.nomiStelle) {
      const sx = X(s.x), sy = Y(s.y);
      if (sx < 40 || sx > l - 40 || sy < 30 || sy > h - 30) continue;
      p.fillText(s.n, sx, sy - 9);
    }
    if (p.letterSpacing !== undefined) p.letterSpacing = "0px";

    // Le stelle che pulseranno: solo le luminose, e neanche tutte. Una a una
    // sono impercettibili; tutte insieme farebbero sfarfallare la pagina.
    scintillanti = [];
    for (const [x, y, mag, bv] of dati.stelle) {
      if (mag > 3.2 || Math.random() > 0.45) continue;
      const sx = X(x), sy = Y(y);
      if (sx < 0 || sx > l || sy < 0 || sy > h) continue;
      scintillanti.push({ sx, sy, mag, tinta: tinta(bv), fase: Math.random() * 6.28 });
    }
  }

  function prepara() {
    const m = misura();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(m.l * dpr);
    tela.height = Math.round(m.h * dpr);
    pennello.setTransform(dpr, 0, 0, dpr, 0, 0);
    disegnaFondale(m);
    mostra(m);
  }

  function mostra({ l, h }) {
    pennello.clearRect(0, 0, l, h);
    pennello.drawImage(fondale, 0, 0, l, h);
  }

  function ritocca(adesso) {
    animazione = requestAnimationFrame(ritocca);
    // Venti fotogrammi al secondo bastano a un tremolio lento, e costano un
    // terzo della batteria di sessanta.
    if (adesso - ultimoRitocco < 50) return;
    ultimoRitocco = adesso;

    const m = misura();
    mostra(m);
    const t = adesso / 1000;
    for (const s of scintillanti) {
      const oscilla = 0.72 + 0.28 * Math.sin(t * 1.6 + s.fase);
      const [r, g, b] = s.tinta;
      pennello.fillStyle = `rgba(${r},${g},${b},${forza(s.mag) * oscilla})`;
      pennello.beginPath();
      pennello.arc(s.sx, s.sy, raggio(s.mag) * oscilla, 0, 6.2832);
      pennello.fill();
    }
  }

  function avviaTremolio() {
    if (animazione || menoMovimento.matches || document.hidden) return;
    animazione = requestAnimationFrame(ritocca);
  }

  function fermaTremolio() {
    if (animazione) cancelAnimationFrame(animazione);
    animazione = null;
  }


  /* ---------- caricare il cielo solo quando serve ----------
     cielo.js sono quasi quaranta chilobyte di coordinate. Chi non accende mai
     la notte non ha motivo di scaricarli, quindi il file entra in pagina al
     primo click e non prima. */

  function portaIlCielo() {
    if (dati || inCaricamento) return;
    inCaricamento = true;
    const s = document.createElement("script");
    s.src = "cielo.js";
    s.onload = () => {
      inCaricamento = false;
      dati = window.CIELO || null;
      if (dati && corpo.classList.contains("notte")) {
        prepara();
        avviaTremolio();
      }
    };
    // Se il file non arriva, la modalità notturna resta comunque una modalità
    // notturna: fondo nero e testi chiari, solo senza stelle. Non si rompe niente.
    s.onerror = () => { inCaricamento = false; };
    document.head.appendChild(s);
  }


  /* ---------- l'interruttore ---------- */

  function applica(accesa, ricorda) {
    corpo.classList.toggle("notte", accesa);
    bottone.setAttribute("aria-pressed", String(accesa));
    bottone.setAttribute("aria-label",
      accesa ? "Torna alla modalità chiara" : "Attiva la modalità notturna");
    bottone.title = accesa ? "Torna al giorno" : "Modalità notturna";

    if (accesa) {
      if (dati) { prepara(); avviaTremolio(); } else portaIlCielo();
    } else {
      fermaTremolio();
    }

    if (ricorda) {
      // In navigazione privata scrivere può lanciare un'eccezione: la scelta
      // vale comunque per questa visita, semplicemente non sopravvive.
      try { localStorage.setItem(RICORDO, accesa ? "si" : "no"); } catch {}
    }
  }

  bottone.addEventListener("click", () => {
    applica(!corpo.classList.contains("notte"), true);
  });

  // Ridisegnare a ogni pixel di ridimensionamento è sprecato: si aspetta che
  // la finestra si fermi.
  let attesa = null;
  window.addEventListener("resize", () => {
    if (!corpo.classList.contains("notte") || !dati) return;
    clearTimeout(attesa);
    attesa = setTimeout(() => { prepara(); }, 200);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) fermaTremolio();
    else if (corpo.classList.contains("notte") && dati) avviaTremolio();
  });

  menoMovimento.addEventListener("change", () => {
    if (menoMovimento.matches) fermaTremolio();
    else if (corpo.classList.contains("notte") && dati) avviaTremolio();
  });

  // La scelta di chi è già passato di qui. Il valore predefinito è il giorno:
  // il sito è un bosco d'estate, la notte è una cosa che si sceglie.
  let ricordato = null;
  try { ricordato = localStorage.getItem(RICORDO); } catch {}
  if (ricordato === "si") applica(true, false);
})();
