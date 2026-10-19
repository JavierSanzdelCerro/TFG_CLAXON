#!/usr/bin/env python3
"""
Música y efectos de los anuncios de Claxon, generados con numpy (sin samples externos).

  python3 musica.py linea_tiempo.json salida.wav

La línea de tiempo (la escribe videos.js) dice cuándo entra cada escena:
  - gancho: solo un colchón suave y dos toques de claxon («mec, mec»)
  - escenas: marimba, bajo y percusión ligera; un «fiu» en cada cambio de escena
  - cierre: un toque de claxon con el logo y acorde final
"""
import json
import sys
import wave

import numpy as np

SR = 44100
BPM = 104
PULSO = 60 / BPM
COMPAS = 4 * PULSO

# Sol mayor: G – D – Em – C (MIDI de la nota más grave del acorde)
ACORDES = [[55, 59, 62], [50, 54, 57], [52, 55, 59], [48, 52, 55]]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def tramo(dur):
    return np.arange(int(dur * SR)) / SR


def suavizar(x, n):
    if n <= 1:
        return x
    return np.convolve(x, np.ones(n) / n, mode="same")


def marimba(f, dur=0.6):
    t = tramo(dur)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
         + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 25)
         + 0.08 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t * 45))
    return s * np.minimum(1, t / 0.004)


def bajo(f, dur=0.5):
    t = tramo(dur)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.exp(-t * 4.5) * np.minimum(1, t / 0.006)


def colchon(notas, dur):
    t = tramo(dur)
    s = sum(np.sin(2 * np.pi * hz(n) * d * t) for n in notas for d in (0.9975, 1.0025))
    ataque = np.minimum(1, t / 0.5)
    caida = np.minimum(1, (dur - t) / 0.6).clip(0, 1)
    return s * ataque * caida / (2 * len(notas))


def bombo():
    t = tramo(0.25)
    f = 45 + 75 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)


def palmada(rng):
    t = tramo(0.18)
    r = np.diff(rng.standard_normal(len(t) + 1))
    return r * np.exp(-t * 28)


def platillo(rng):
    t = tramo(0.06)
    r = np.diff(rng.standard_normal(len(t) + 2), 2)
    return r * np.exp(-t * 70)


def fiu(rng, dur=0.5):
    t = tramo(dur)
    r = suavizar(rng.standard_normal(len(t)), 12)
    env = np.sin(np.pi * t / dur) ** 2
    return r * env


def claxon(dur):
    """Bocina de furgoneta: dos tonos (tercera mayor) con armónicos y algo de saturación."""
    t = tramo(dur)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 7 * t)
    s = np.zeros_like(t)
    for f in (392.0, 494.0):
        fase = 2 * np.pi * np.cumsum(f * vib) / SR
        s += sum(np.sin(k * fase) / k for k in range(1, 9))
    env = np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.04).clip(0, 1)
    s = np.tanh(1.8 * s * env)
    return suavizar(s, 4)


def poner(pista, sonido, inicio, vol):
    i = int(inicio * SR)
    if i >= len(pista):
        return
    fin = min(len(pista), i + len(sonido))
    pista[i:fin] += vol * sonido[: fin - i]


def main():
    linea = json.load(open(sys.argv[1], encoding="utf-8"))
    total = linea["total"]
    inicio_musica = linea["inicio_musica"]
    inicio_cierre = linea["inicio_cierre"]
    rng = np.random.default_rng(7)

    pista = np.zeros(int((total + 0.5) * SR))

    # Gancho: colchón suave y «mec, mec»
    poner(pista, colchon([n + 12 for n in ACORDES[0]], inicio_musica + 0.3), 0, 0.10)
    poner(pista, claxon(0.22), 0.25, 0.30)
    poner(pista, claxon(0.38), 0.58, 0.30)

    # Cuerpo: compases desde que entra la primera escena hasta un poco después del cierre
    fin_ritmo = inicio_cierre + 2 * COMPAS
    n_compas = int(np.ceil((fin_ritmo - inicio_musica) / COMPAS))
    for c in range(n_compas):
        t0 = inicio_musica + c * COMPAS
        acorde = ACORDES[c % 4]
        tonos = [n + 12 for n in acorde] + [acorde[0] + 24]
        poner(pista, colchon([n + 12 for n in acorde], COMPAS + 0.4), t0, 0.06)
        for k, idx in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
            poner(pista, marimba(hz(tonos[idx])), t0 + k * PULSO / 2, 0.16 if k % 2 == 0 else 0.11)
        raiz = hz(acorde[0] - 12)
        for b in (0, 2, 3.5):
            poner(pista, bajo(raiz), t0 + b * PULSO, 0.22)
        for b in (0, 2):
            poner(pista, bombo(), t0 + b * PULSO, 0.42)
        for b in (1, 3):
            poner(pista, palmada(rng), t0 + b * PULSO, 0.10)
        for k in range(8):
            poner(pista, platillo(rng), t0 + (k + 0.5) * PULSO / 2, 0.035)

    # Cambios de escena
    for t in linea["transiciones"]:
        poner(pista, fiu(rng), t - 0.15, 0.05)

    # Cierre: claxon con el logo y acorde final largo
    poner(pista, claxon(0.3), inicio_cierre + 0.2, 0.26)
    final = fin_ritmo
    poner(pista, colchon([67, 71, 74, 79], total - final + 0.4), final, 0.12)
    poner(pista, marimba(hz(79), 1.6), final, 0.18)

    # Mezcla: normalizar y fundidos
    pista = pista[: int(total * SR)]
    pista /= np.max(np.abs(pista)) / 0.89
    n_out = int(1.6 * SR)
    pista[-n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    pista[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))

    estereo = np.repeat((pista * 32767).astype(np.int16)[:, None], 2, axis=1)
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(estereo.tobytes())


if __name__ == "__main__":
    main()
