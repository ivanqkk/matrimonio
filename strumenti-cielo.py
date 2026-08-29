#!/usr/bin/env python3
"""
Genera cielo.js: il cielo sopra Toceno la notte del matrimonio.

Il sito non calcola niente. Le posizioni delle stelle dipendono da data, ora e
luogo, e quelle sono fissate una volta per sempre: tanto vale calcolarle qui e
spedire al browser dei numeri già pronti. Vuol dire nessuna libreria di
astronomia da caricare, nessuna differenza fra chi apre la pagina stasera e chi
la apre fra un anno, e soprattutto: è il VOSTRO cielo, non quello di chi guarda.

    python3 strumenti-cielo.py

Scarica i cataloghi (servono solo qui, non finiscono nel sito) e riscrive
cielo.js. Da rilanciare solo se cambiate data, ora o luogo qui sotto.
"""

import json, math, urllib.request

# ---------------------------------------------------------------- i dati fissi

LUOGO = "Toceno, Val Vigezzo"
LAT = 46.1333          # gradi nord
LON = 8.4167           # gradi est
ALTEZZA_M = 900

# La notte del matrimonio. In luglio l'Italia è a UTC+2, quindi le 23:30 in
# paese sono le 21:30 UTC. A quest'ora il sole è tramontato da un pezzo e il
# crepuscolo astronomico è finito: il cielo è nero davvero.
ANNO, MESE, GIORNO = 2027, 7, 24
ORA_UTC = 21.5
ORA_LOCALE = "23:30"

# Fin dove scendere in luminosità. La sesta è il limite dell'occhio umano in
# montagna, ma sono 5000 stelle: il disegno diventa una zuppa e il file pesa.
# La 5.2 lascia un cielo pieno che si legge ancora.
MAG_LIMITE = 5.2

SORGENTI = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/"

# Le costellazioni da etichettare: quelle che in una notte d'estate si
# riconoscono a occhio nudo. Le altre restano disegnate ma senza nome, così il
# cielo non diventa un atlante.
# Le poche stelle il cui nome in italiano non coincide con quello del catalogo.
IN_ITALIANO = {"Arcturus": "Arturo", "Polaris": "Polare"}

DA_NOMINARE = {
    "Cyg", "Lyr", "Aql", "UMa", "UMi", "Cas", "Boo", "CrB", "Her",
    "Sco", "Sgr", "Oph", "Dra", "Cep", "Peg", "And", "Per", "Ser", "Del",
}


# ------------------------------------------------------------- un po' di cielo

def giorno_giuliano(anno, mese, giorno, ora_utc):
    if mese <= 2:
        anno, mese = anno - 1, mese + 12
    a = anno // 100
    b = 2 - a + a // 4
    return (math.floor(365.25 * (anno + 4716)) + math.floor(30.6001 * (mese + 1))
            + giorno + b - 1524.5 + ora_utc / 24.0)


def precessione(ra, dec, T):
    """Da J2000 all'epoca della data. In 27 anni gli assi terrestri girano di
    poco più di un terzo di grado: invisibile a occhio, ma correggerlo costa
    dieci righe e toglie il dubbio."""
    zeta = math.radians((2306.2181 * T + 0.30188 * T**2 + 0.017998 * T**3) / 3600)
    z = math.radians((2306.2181 * T + 1.09468 * T**2 + 0.018203 * T**3) / 3600)
    theta = math.radians((2004.3109 * T - 0.42665 * T**2 - 0.041833 * T**3) / 3600)

    A = math.cos(dec) * math.sin(ra + zeta)
    B = math.cos(theta) * math.cos(dec) * math.cos(ra + zeta) - math.sin(theta) * math.sin(dec)
    C = math.sin(theta) * math.cos(dec) * math.cos(ra + zeta) + math.cos(theta) * math.sin(dec)
    return math.atan2(A, B) + z, math.asin(max(-1, min(1, C)))


def tempo_siderale(jd):
    """Quanto ha girato il cielo, in gradi, sopra il meridiano di Toceno."""
    T = (jd - 2451545.0) / 36525.0
    gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)
            + 0.000387933 * T**2 - T**3 / 38710000.0)
    return (gmst + LON) % 360


def alt_az(ra_gradi, dec_gradi, lst_gradi, T):
    """Da dove sta in cielo a dove sta sopra la vostra testa."""
    ra, dec = precessione(math.radians(ra_gradi), math.radians(dec_gradi), T)
    H = math.radians(lst_gradi) - ra
    lat = math.radians(LAT)

    sin_alt = math.sin(dec) * math.sin(lat) + math.cos(dec) * math.cos(lat) * math.cos(H)
    alt = math.asin(max(-1, min(1, sin_alt)))
    az = math.atan2(-math.cos(dec) * math.sin(H),
                    math.sin(dec) * math.cos(lat) - math.cos(dec) * math.sin(lat) * math.cos(H))
    return math.degrees(alt), math.degrees(az) % 360


def sole(jd):
    """Posizione del Sole, formule a bassa precisione (Meeus): bastano per
    rispondere alla sola domanda che ci interessa, cioè se è notte."""
    T = (jd - 2451545.0) / 36525.0
    L = math.radians((280.46646 + 36000.76983 * T) % 360)
    M = math.radians((357.52911 + 35999.05029 * T) % 360)
    C = math.radians((1.914602 - 0.004817 * T) * math.sin(M)
                     + 0.019993 * math.sin(2 * M) + 0.000289 * math.sin(3 * M))
    lam = L + C
    eps = math.radians(23.439291 - 0.0130042 * T)
    ra = math.degrees(math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))) % 360
    dec = math.degrees(math.asin(math.sin(eps) * math.sin(lam)))
    return ra, dec


def fase_lunare(jd):
    """Età della Luna in giorni dal novilunio. Approssimazione media: sbaglia
    di qualche ora, il che sposta la falce di pochissimo."""
    eta = (jd - 2451550.09766) % 29.530588853
    frazione = eta / 29.530588853
    illuminata = (1 - math.cos(2 * math.pi * frazione)) / 2
    return eta, illuminata


# ------------------------------------------------------------- la proiezione

def proietta(alt, az):
    """Sky → schermo, proiezione stereografica dallo zenit.

    Guardiamo in su, non in giù: il nord sta in alto e l'est a SINISTRA, come su
    un planisfero, non come su una carta geografica. Lo zenit — il punto sopra
    la testa — cade al centro; l'orizzonte è il cerchio di raggio 1."""
    z = math.radians(90 - alt)
    r = math.tan(z / 2)
    a = math.radians(az)
    return -r * math.sin(a), -r * math.cos(a)


# ------------------------------------------------------------------ il lavoro

def scarica(nome):
    with urllib.request.urlopen(SORGENTI + nome, timeout=60) as r:
        return json.load(r)


def principale():
    jd = giorno_giuliano(ANNO, MESE, GIORNO, ORA_UTC)
    T = (jd - 2451545.0) / 36525.0
    lst = tempo_siderale(jd)

    print(f"Toceno, {GIORNO}/{MESE}/{ANNO} {ORA_LOCALE} locali ({ORA_UTC:.1f} UTC)")
    print(f"  giorno giuliano {jd:.5f}   tempo siderale locale {lst / 15:.3f} h")

    # --- controlli: se uno di questi è sbagliato, è sbagliato tutto il resto
    ra_s, dec_s = sole(jd)
    alt_sole, _ = alt_az(ra_s, dec_s, lst, T)
    print(f"  Sole: {alt_sole:+.1f}°  ({'notte piena' if alt_sole < -18 else 'ATTENZIONE: cè ancora luce'})")

    alt_pol, az_pol = alt_az(37.9529, 89.2641, lst, T)   # Polaris
    print(f"  Polare: {alt_pol:.2f}° di altezza, azimut {az_pol:.1f}° "
          f"(deve valere la latitudine, {LAT}°, e stare a nord)")

    for nome, ra, dec in (("Vega", 279.2347, 38.7837),
                          ("Deneb", 310.3580, 45.2803),
                          ("Altair", 297.6958, 8.8683),
                          ("Antares", 247.3519, -26.4320)):
        a, z = alt_az(ra, dec, lst, T)
        print(f"  {nome}: {a:+.1f}° altezza, azimut {z:.0f}°")

    eta, illuminata = fase_lunare(jd)
    print(f"  Luna: {eta:.1f} giorni dal novilunio, {illuminata * 100:.0f}% illuminata")

    # --- stelle
    print("\nScarico i cataloghi…")
    catalogo = scarica("stars.6.json")["features"]
    nomi = scarica("starnames.json")
    linee = scarica("constellations.lines.json")["features"]
    anagrafica = {f["id"]: f["properties"] for f in scarica("constellations.json")["features"]}

    stelle, stelle_con_nome = [], []
    for f in catalogo:
        mag = f["properties"]["mag"]
        if mag > MAG_LIMITE:
            continue
        ra, dec = f["geometry"]["coordinates"]
        alt, az = alt_az(ra % 360, dec, lst, T)
        if alt <= 0:
            continue
        x, y = proietta(alt, az)
        # L'indice di colore B-V dice se la stella è azzurra o rossa. Costa
        # quattro caratteri per stella e cambia parecchio il disegno: Antares
        # rossa e Vega bianco-azzurra sono due cose diverse anche a occhio.
        try:
            bv = round(float(f["properties"].get("bv") or 0.6), 2)
        except ValueError:
            bv = 0.6
        stelle.append([round(x, 4), round(y, 4), round(mag, 2), bv])

        n = nomi.get(str(f["id"]), {}).get("name", "")
        if n and mag <= 1.6:
            stelle_con_nome.append({"n": IN_ITALIANO.get(n, n),
                                    "x": round(x, 4), "y": round(y, 4)})

    # --- figure delle costellazioni: teniamo solo i segmenti con TUTTI E DUE i
    # capi sopra l'orizzonte, altrimenti si vedrebbero linee che affondano nel
    # terreno verso stelle che non ci sono.
    segmenti, etichette = [], []
    for f in linee:
        sigla = f["id"]
        punti_visibili = []
        miei = []
        for tratto in f["geometry"]["coordinates"]:
            proiettati = []
            for ra, dec in tratto:
                alt, az = alt_az(ra % 360, dec, lst, T)
                proiettati.append((proietta(alt, az), alt))
            for (p1, a1), (p2, a2) in zip(proiettati, proiettati[1:]):
                if a1 > 0 and a2 > 0:
                    miei.append([round(p1[0], 4), round(p1[1], 4),
                                 round(p2[0], 4), round(p2[1], 4)])
                    punti_visibili += [p1, p2]
        if not miei:
            continue
        segmenti += miei

        if sigla in DA_NOMINARE and punti_visibili:
            cx = sum(p[0] for p in punti_visibili) / len(punti_visibili)
            cy = sum(p[1] for p in punti_visibili) / len(punti_visibili)
            etichette.append({"n": anagrafica[sigla].get("it") or anagrafica[sigla]["name"],
                              "x": round(cx, 4), "y": round(cy, 4),
                              "_peso": len(punti_visibili)})

    migliori = {}
    for e in etichette:
        if e["n"] not in migliori or e["_peso"] > migliori[e["n"]]["_peso"]:
            migliori[e["n"]] = e
    etichette = [{k: v for k, v in e.items() if k != "_peso"} for e in migliori.values()]

    dati = {
        "luogo": LUOGO,
        "quando": f"{GIORNO} luglio {ANNO}, {ORA_LOCALE}",
        "stelle": stelle,
        "linee": segmenti,
        "costellazioni": etichette,
        "nomiStelle": stelle_con_nome,
        "luna": {"eta": round(eta, 2), "illuminata": round(illuminata, 3)},
    }

    testo = ("/* Generato da strumenti-cielo.py — non modificare a mano.\n"
             f"   Il cielo sopra {LUOGO} il {GIORNO}/{MESE}/{ANNO} alle {ORA_LOCALE}.\n"
             "   Coordinate: zenit al centro, orizzonte sul cerchio di raggio 1,\n"
             "   nord in alto, est a sinistra (si guarda in su, non in giù). */\n"
             "window.CIELO = " + json.dumps(dati, ensure_ascii=False, separators=(",", ":")) + ";\n")

    with open("cielo.js", "w", encoding="utf-8") as f:
        f.write(testo)

    print(f"\ncielo.js scritto: {len(stelle)} stelle, {len(segmenti)} segmenti, "
          f"{len(etichette)} costellazioni con nome, {len(testo) / 1024:.1f} KB")


if __name__ == "__main__":
    principale()
