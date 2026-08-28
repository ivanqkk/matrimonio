/* ============================================================
   Ivan & Greta — comportamenti della pagina

   ▼▼▼ MODIFICA SOLO QUESTO BLOCCO ▼▼▼
   ============================================================ */

const CONFIG = {
  // Data e ora della cerimonia (anno, mese-1, giorno, ora, minuti).
  // Attenzione: i mesi partono da 0, quindi luglio = 6.
  dataMatrimonio: new Date(2027, 6, 24, 11, 0),

  // Indirizzo dove ricevere le conferme.
  // Come ottenerlo è spiegato nel README, sezione "Modulo di conferma".
  endpointModulo: "https://script.google.com/macros/s/AKfycbynAN7HUaAKyVa2s4OTvY4hxu5afL8XEZCyhVQwnsMY-x-tp7PP20VUZBYNFaG_KEmSjw/exec",

  // "apps-script" → una riga per invitato in un foglio Google, e le
  //                 risposte già date vengono aggiornate al posto loro.
  // "formspree"   → ogni conferma arriva come una email a sé. Più veloce
  //                 da attivare, ma nessun riepilogo: gli aggiornamenti
  //                 restano email separate da confrontare a mano.
  tipoEndpoint: "apps-script",

  // Numero massimo di invitati per gruppo (deve combaciare con le
  // opzioni del menu "Quante persone" in index.html)
  maxInvitati: 8,
};

/* ▲▲▲ FINE DEL BLOCCO DA MODIFICARE ▲▲▲ */


/* ---------- 1. Conto alla rovescia ---------- */

const elGiorni = document.getElementById("cdGiorni");
const elOre = document.getElementById("cdOre");
const elMinuti = document.getElementById("cdMinuti");

function aggiornaConto() {
  const mancano = CONFIG.dataMatrimonio - new Date();

  if (mancano <= 0) {
    document.querySelector(".conto").innerHTML =
      '<p style="margin:0;letter-spacing:.2em;text-transform:uppercase;font-size:.8rem">Grazie di essere stati con noi</p>';
    return;
  }

  const minutiTotali = Math.floor(mancano / 60000);
  elGiorni.textContent = Math.floor(minutiTotali / 1440);
  elOre.textContent = Math.floor((minutiTotali % 1440) / 60);
  elMinuti.textContent = minutiTotali % 60;
}

aggiornaConto();
setInterval(aggiornaConto, 30000);


/* ---------- 2. Navigazione ---------- */

const nav = document.getElementById("nav");
const navMenu = document.getElementById("navMenu");
const navToggle = document.getElementById("navToggle");

// La barra compare quando l'apertura è passata
window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--visibile", window.scrollY > window.innerHeight * 0.7);
}, { passive: true });

navToggle.addEventListener("click", () => {
  const aperto = navMenu.classList.toggle("nav__menu--aperto");
  navToggle.setAttribute("aria-expanded", String(aperto));
});

navMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("nav__menu--aperto");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Evidenzia la sezione in cui ci si trova
const sezioni = [...document.querySelectorAll("main section[id]")];
const osservatoreNav = new IntersectionObserver((voci) => {
  voci.forEach((voce) => {
    if (!voce.isIntersecting) return;
    navMenu.querySelectorAll("a").forEach((a) => {
      a.classList.toggle("attivo", a.getAttribute("href") === "#" + voce.target.id);
    });
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sezioni.forEach((s) => osservatoreNav.observe(s));


/* ---------- 3. Comparsa dei blocchi allo scorrimento ---------- */

document.querySelectorAll(".sezione .contenitore > *")
  .forEach((el, i) => {
    el.classList.add("rivela");
    el.style.transitionDelay = (i % 4) * 60 + "ms";
  });

const osservatoreRivela = new IntersectionObserver((voci, obs) => {
  voci.forEach((voce) => {
    if (!voce.isIntersecting) return;
    voce.target.classList.add("rivela--vista");
    obs.unobserve(voce.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".rivela").forEach((el) => osservatoreRivela.observe(el));


/* ---------- 4. Carosello delle foto ----------
   Lo scorrimento è del browser: la pista è un contenitore che scorre in
   orizzontale con scroll-snap, quindi col dito funziona anche senza questo
   codice. Qui aggiungiamo solo frecce e puntini, e li teniamo aggiornati
   leggendo la posizione di scorrimento. Se il JavaScript non parte, il
   carosello resta comunque usabile. */

const pista = document.getElementById("carosalloPista");

if (pista) {
  const diapositive = [...pista.querySelectorAll(".diapositiva")];
  const prec = document.getElementById("fotoPrec");
  const succ = document.getElementById("fotoSucc");
  const contenitorePunti = document.getElementById("fotoPunti");

  const pulsantePausa = document.getElementById("fotoPausa");
  const testoPausa = document.getElementById("fotoPausaTesto");

  const ultima = diapositive.length - 1;
  let corrente = 0;

  // Frecce e puntini seguono l'indice, non la posizione di scorrimento: lo
  // scorrimento è morbido e arriva qualche centinaio di millisecondi dopo il
  // clic, quindi leggendo scrollLeft l'interfaccia resterebbe indietro di un
  // passo (e la freccia "indietro" resterebbe disattivata).
  const aggiorna = (i) => {
    // gira: dall'ultima si torna alla prima, e viceversa
    corrente = (i + diapositive.length) % diapositive.length;
    punti.forEach((b, k) => b.setAttribute("aria-current", String(k === corrente)));
  };

  const vaA = (i, istantaneo) => {
    const precedente = corrente;
    aggiorna(i);
    const d = diapositive[corrente];
    if (!d) return;
    // Il salto di fine giro attraverserebbe tutte le foto: quello si fa secco.
    const salto = istantaneo || Math.abs(corrente - precedente) > 1;
    if (salto) pista.style.scrollBehavior = "auto";
    pista.scrollTo({ left: d.offsetLeft - pista.offsetLeft });
    if (salto) requestAnimationFrame(() => { pista.style.scrollBehavior = ""; });
  };

  // quale diapositiva è più vicina al centro: serve per lo scorrimento col dito
  const indiceVisibile = () => {
    const centro = pista.scrollLeft + pista.clientWidth / 2;
    let vicina = 0;
    let minimo = Infinity;
    diapositive.forEach((d, i) => {
      const dist = Math.abs(d.offsetLeft - pista.offsetLeft + d.offsetWidth / 2 - centro);
      if (dist < minimo) { minimo = dist; vicina = i; }
    });
    return vicina;
  };

  const punti = diapositive.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "carosello__punto";
    b.setAttribute("aria-label", `Vai alla foto ${i + 1} di ${diapositive.length}`);
    b.addEventListener("click", () => { vaA(i); riparti(); });
    contenitorePunti.append(b);
    return b;
  });

  /* --- scorrimento automatico ---
     Sei secondi: il tempo di guardare una foto senza che chi legge il resto
     della pagina se la ritrovi a cambiare sotto gli occhi.

     Si ferma da solo in quattro casi. Col mouse sopra o col fuoco da tastiera
     dentro, perché chi sta guardando o navigando non vuole essere interrotto.
     Quando il carosello esce dallo schermo, per non far lavorare il telefono a
     vuoto. Col pulsante di pausa, che è una richiesta esplicita e vince su
     tutto. E non parte affatto se il sistema è impostato per ridurre le
     animazioni: lì un movimento non richiesto può dare fastidio davvero. */
  const RITMO = 6000;
  const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

  let timer = null;
  let inPausa = false;    // pausa chiesta dall'utente
  let sospeso = false;    // sospensione temporanea: mouse, fuoco, fuori schermo

  const puoScorrere = () =>
    diapositive.length > 1 && !inPausa && !sospeso && !menoMovimento.matches;

  const ferma = () => { clearInterval(timer); timer = null; };
  const parti = () => {
    if (timer || !puoScorrere()) return;
    timer = setInterval(() => vaA(corrente + 1), RITMO);
  };
  // dopo un'interazione il conto riparte da zero, altrimenti la foto appena
  // scelta potrebbe cambiare dopo mezzo secondo
  const riparti = () => { ferma(); parti(); };

  if (pulsantePausa) {
    pulsantePausa.addEventListener("click", () => {
      inPausa = !inPausa;
      pulsantePausa.setAttribute("aria-pressed", String(inPausa));
      pulsantePausa.classList.toggle("carosello__pausa--fermo", inPausa);
      testoPausa.textContent = inPausa ? "Riprendi" : "Metti in pausa";
      if (inPausa) ferma(); else parti();
    });
  }

  const sospendi = () => { sospeso = true; ferma(); };
  const riprendi = () => { sospeso = false; parti(); };

  const carosello = document.getElementById("carosello");
  carosello.addEventListener("pointerenter", sospendi);
  carosello.addEventListener("pointerleave", riprendi);
  carosello.addEventListener("focusin", sospendi);
  carosello.addEventListener("focusout", (e) => {
    if (!carosello.contains(e.relatedTarget)) riprendi();
  });

  new IntersectionObserver((voci) => {
    voci.forEach((v) => { v.isIntersecting ? riprendi() : sospendi(); });
  }, { threshold: 0.35 }).observe(carosello);

  menoMovimento.addEventListener("change", () => {
    if (menoMovimento.matches) ferma(); else parti();
  });

  prec.addEventListener("click", () => { vaA(corrente - 1); riparti(); });
  succ.addEventListener("click", () => { vaA(corrente + 1); riparti(); });

  pista.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); vaA(corrente + 1); riparti(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); vaA(corrente - 1); riparti(); }
  });

  let attesa;
  pista.addEventListener("scroll", () => {
    clearTimeout(attesa);
    attesa = setTimeout(() => aggiorna(indiceVisibile()), 90);
  }, { passive: true });

  aggiorna(0);
  if (menoMovimento.matches && pulsantePausa) pulsantePausa.hidden = true;
}


/* ---------- 5. Copia dell'IBAN ---------- */

/* Gli intestatari sono due, quindi i bottoni sono due. Invece di cercarli per
   id li prendiamo tutti insieme: chiunque aggiunga una scheda nell'HTML ottiene
   il bottone funzionante senza toccare questo file. Ogni bottone scrive nel
   "Copiato" della PROPRIA scheda (lo cerca dentro il .iban che lo contiene),
   altrimenti copiando il secondo IBAN si accenderebbe la conferma del primo. */

document.querySelectorAll("[data-iban]").forEach((bottone) => {
  const messaggio = bottone.closest(".iban").querySelector(".iban__copiato");
  let attesa = null;

  bottone.addEventListener("click", async () => {
    const iban = bottone.dataset.iban.replace(/\s/g, "");
    try {
      await navigator.clipboard.writeText(iban);
      messaggio.textContent = "Copiato";
    } catch {
      messaggio.textContent = "Selezionalo e copialo a mano";
    }
    messaggio.hidden = false;
    // Il timer va azzerato a ogni clic: senza questo, due clic ravvicinati
    // lasciano in piedi il primo timeout, che nasconde il messaggio del secondo
    // dopo una frazione di secondo.
    clearTimeout(attesa);
    attesa = setTimeout(() => { messaggio.hidden = true; }, 3000);
  });
});


/* ---------- 6. Modulo: campi per ogni invitato ---------- */

const modulo = document.getElementById("modulo");
const siPartecipo = document.getElementById("siPartecipo");
const noPartecipo = document.getElementById("noPartecipo");
const bloccoPresenti = document.getElementById("bloccoPresenti");
const numeroPersone = document.getElementById("numeroPersone");
const contenitoreInvitati = document.getElementById("invitati");
const esito = document.getElementById("esito");
const bottoneInvia = document.getElementById("invia");

const ALLERGIE_RAPIDE = ["Nessuna", "Glutine", "Lattosio", "Frutta secca", "Crostacei", "Vegetariano/a"];

function schedaInvitato(n) {
  const scheda = document.createElement("div");
  scheda.className = "invitato";
  scheda.innerHTML = `
    <p class="invitato__titolo">${n === 1 ? "Invitato 1 · sei tu" : "Invitato " + n}</p>
    <div class="campo">
      <label for="nome-${n}">Nome e cognome</label>
      <input type="text" id="nome-${n}" name="Invitato ${n} — nome" data-obbligatorio
             data-errore="Serve il nome di questa persona per il tavolo e il segnaposto.">
    </div>
    <div class="campo">
      <label for="allergie-${n}">Allergie e intolleranze</label>
      <input type="text" id="allergie-${n}" name="Invitato ${n} — allergie" data-obbligatorio
             placeholder="Es. lattosio, arachidi…"
             data-errore="Campo obbligatorio: se non ci sono allergie scrivi «nessuna».">
      <div class="rapide">
        ${ALLERGIE_RAPIDE.map((v) => `<button type="button" class="rapida" data-valore="${v}">${v}</button>`).join("")}
      </div>
      <p class="campo__aiuto">Il catering prepara i piatti su queste indicazioni, quindi non possiamo lasciarlo vuoto.</p>
    </div>`;
  return scheda;
}

function costruisciInvitati() {
  const quanti = Math.min(Number(numeroPersone.value) || 1, CONFIG.maxInvitati);
  const valoriPrecedenti = [...contenitoreInvitati.querySelectorAll("input")].map((i) => i.value);

  contenitoreInvitati.innerHTML = "";
  for (let n = 1; n <= quanti; n++) contenitoreInvitati.appendChild(schedaInvitato(n));

  // non far perdere quello che era già stato scritto
  contenitoreInvitati.querySelectorAll("input").forEach((input, i) => {
    if (valoriPrecedenti[i]) input.value = valoriPrecedenti[i];
  });
}

// I pulsanti rapidi riempiono il campo allergie
contenitoreInvitati.addEventListener("click", (e) => {
  const rapida = e.target.closest(".rapida");
  if (!rapida) return;
  const campo = rapida.closest(".campo").querySelector("input");
  campo.value = rapida.dataset.valore;
  pulisciErrore(campo);
  campo.focus();
});

function aggiornaPartecipazione() {
  const partecipa = siPartecipo.checked;
  bloccoPresenti.hidden = !partecipa;
  if (partecipa && !contenitoreInvitati.children.length) costruisciInvitati();
  if (!partecipa) contenitoreInvitati.querySelectorAll("input").forEach(pulisciErrore);
}

siPartecipo.addEventListener("change", aggiornaPartecipazione);
noPartecipo.addEventListener("change", aggiornaPartecipazione);
numeroPersone.addEventListener("change", costruisciInvitati);


/* ---------- 7. Modulo: controlli ---------- */

function mostraErrore(campo, testo) {
  campo.setAttribute("aria-invalid", "true");
  let msg = campo.parentElement.querySelector(".errore");
  if (!msg) {
    msg = document.createElement("span");
    msg.className = "errore";
    campo.insertAdjacentElement("afterend", msg);
  }
  msg.textContent = testo;
}

function pulisciErrore(campo) {
  campo.removeAttribute("aria-invalid");
  const msg = campo.parentElement.querySelector(".errore");
  if (msg) msg.remove();
}

modulo.addEventListener("input", (e) => {
  if (e.target.value.trim()) pulisciErrore(e.target);
});

function controlla() {
  const daControllare = [];

  daControllare.push([document.getElementById("referente"), "Scrivi il nome della persona di riferimento."]);
  daControllare.push([document.getElementById("email"), "Serve un indirizzo email valido per il riepilogo."]);

  if (siPartecipo.checked) {
    contenitoreInvitati.querySelectorAll("[data-obbligatorio]").forEach((campo) => {
      daControllare.push([campo, campo.dataset.errore]);
    });
  }

  let primoErrore = null;

  daControllare.forEach(([campo, testo]) => {
    pulisciErrore(campo);
    const vuoto = !campo.value.trim();
    const emailNonValida = campo.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(campo.value.trim());
    if (vuoto || emailNonValida) {
      mostraErrore(campo, testo);
      if (!primoErrore) primoErrore = campo;
    }
  });

  if (!siPartecipo.checked && !noPartecipo.checked) {
    mostraEsito("ko", "Indica se parteciperete: è la prima cosa che ci serve sapere.");
    if (!primoErrore) primoErrore = siPartecipo;
  }

  if (primoErrore) {
    primoErrore.focus();
    primoErrore.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  }
  return true;
}

function mostraEsito(tipo, testo) {
  esito.textContent = testo;
  esito.className = "modulo__esito modulo__esito--" + tipo;
  esito.hidden = false;
}


/* ---------- 8. Modulo: invio ---------- */

/* Quello che raccogliamo non è una lista piatta di caselle ma un gruppo:
   un referente e le persone di cui risponde. Lo mandiamo con questa forma,
   perché il foglio deve poter trattare ogni invitato come una riga a sé e
   ritrovarlo per nome quando la stessa persona rimanda il modulo. */

function datiDelModulo() {
  const valore = (id) => document.getElementById(id).value.trim();

  const invitati = [...contenitoreInvitati.querySelectorAll(".invitato")].map((scheda) => ({
    nome: scheda.querySelector('input[id^="nome-"]').value.trim(),
    allergie: scheda.querySelector('input[id^="allergie-"]').value.trim(),
  })).filter((p) => p.nome);

  return {
    referente: valore("referente"),
    email: valore("email"),
    telefono: valore("telefono"),
    partecipazione: siPartecipo.checked ? "si" : "no",
    messaggio: valore("messaggio"),
    invitati: siPartecipo.checked ? invitati : [],
  };
}

/* Formspree si aspetta dei campi, non un oggetto: qui il gruppo torna
   piatto, una coppia di campi per invitato. Serve solo a chi sceglie
   quella strada; con Apps Script parte il JSON qui sopra. */

function appiattisci(dati) {
  const campi = new FormData();
  campi.append("Persona di riferimento", dati.referente);
  campi.append("Email", dati.email);
  campi.append("Telefono", dati.telefono);
  campi.append("Partecipazione", dati.partecipazione === "si" ? "Sì, partecipo" : "No, non partecipo");
  campi.append("Numero di persone", String(dati.invitati.length));
  dati.invitati.forEach((p, i) => {
    campi.append(`Invitato ${i + 1} — nome`, p.nome);
    campi.append(`Invitato ${i + 1} — allergie`, p.allergie);
  });
  campi.append("Messaggio", dati.messaggio);
  campi.append("_subject", "Conferma matrimonio — " + dati.referente);
  return campi;
}

modulo.addEventListener("submit", async (e) => {
  e.preventDefault();
  esito.hidden = true;

  if (!controlla()) return;

  if (CONFIG.endpointModulo.includes("INSERISCI_IL_TUO_CODICE")) {
    mostraEsito("ko", "Il modulo non è ancora collegato: inserisci il tuo indirizzo in script.js, alla voce endpointModulo.");
    return;
  }

  const dati = datiDelModulo();
  const versoFoglio = CONFIG.tipoEndpoint === "apps-script";

  const testoOriginale = bottoneInvia.textContent;
  bottoneInvia.disabled = true;
  bottoneInvia.textContent = "Invio in corso…";

  try {
    /* Il corpo parte come stringa e SENZA impostare Content-Type: il
       browser lo etichetta text/plain, che è fra i tipi "semplici". È
       l'unico modo per non far scattare la richiesta OPTIONS di verifica,
       a cui Apps Script non sa rispondere: la conferma verrebbe rifiutata
       prima ancora di partire. Dall'altra parte il JSON si legge in
       e.postData.contents. */
    const risposta = await fetch(CONFIG.endpointModulo, {
      method: "POST",
      body: versoFoglio ? JSON.stringify(dati) : appiattisci(dati),
      headers: versoFoglio ? {} : { Accept: "application/json" },
      redirect: "follow",
    });

    if (!risposta.ok) throw new Error("HTTP " + risposta.status);

    // Apps Script risponde 200 anche quando il codice dentro è andato in
    // errore, quindi il vero esito è nel corpo. Se non è leggibile non ci
    // inventiamo un fallimento: la riga potrebbe essere stata scritta.
    if (versoFoglio) {
      const detto = await risposta.json().catch(() => null);
      if (detto && detto.ok === false) throw new Error(detto.errore || "rifiutato dal foglio");
    }

    modulo.reset();
    contenitoreInvitati.innerHTML = "";
    bloccoPresenti.hidden = true;
    mostraEsito("ok", "Conferma ricevuta, grazie. Se dovete cambiare qualcosa, tornate qui e rimandate il modulo con gli stessi nomi: sostituisce questa risposta.");
    esito.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch (errore) {
    mostraEsito("ko", "La conferma non è partita. Riprova tra un minuto oppure scrivici a ivanesofia@example.com: registriamo tutto a mano.");
    console.error(errore);
  } finally {
    bottoneInvia.disabled = false;
    bottoneInvia.textContent = testoOriginale;
  }
});
