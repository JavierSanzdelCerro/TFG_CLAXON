#!/usr/bin/env python3
"""
Sonido de las grabaciones de pantalla: música de fondo suave + efectos de la app.

  python3 sonido.py eventos.json salida.wav

eventos.json = {"total": segundos, "eventos": [{"t": 1.2, "tipo": "toque"}, ...]}
Tipos: toque, tecla, clic, tecla-pc, aviso, claxon, exito.
Reutiliza los instrumentos de ../musica.py.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from musica import (ACORDES, COMPAS, PULSO, SR, bajo, bombo, claxon, colchon, hz,  # noqa: E402
                    marimba, platillo, poner, suavizar, tramo)


def toque(rng):
    """Golpecito suave del dedo en el cristal."""
    t = tramo(0.05)
    return (np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 160) * 0.6
            + suavizar(rng.standard_normal(len(t)), 3) * np.exp(-t * 300) * 0.4)


def tecla(rng):
    t = tramo(0.035)
    return suavizar(rng.standard_normal(len(t)), 2) * np.exp(-t * 260) + np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 200) * 0.3


def clic_raton(rng):
    t = tramo(0.04)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 400) + suavizar(rng.standard_normal(len(t)), 2) * np.exp(-t * 500) * 0.5


def tecla_pc(rng):
    t = tramo(0.06)
    golpe = suavizar(rng.standard_normal(len(t)), 4) * np.exp(-t * 140)
    return golpe + np.sin(2 * np.pi * 380 * t) * np.exp(-t * 90) * 0.4


def aviso():
    """Notificación: dos notas de marimba hacia arriba."""
    s = np.zeros(int(0.9 * SR))
    poner(s, marimba(hz(88), 0.8), 0, 0.8)
    poner(s, marimba(hz(93), 0.8), 0.11, 0.9)
    return s


def exito():
    s = np.zeros(int(1.0 * SR))
    for k, n in enumerate([79, 83, 86]):
        poner(s, marimba(hz(n + 12), 0.8), k * 0.08, 0.8)
    return s


def main():
    datos = json.load(open(sys.argv[1], encoding="utf-8"))
    total = datos["total"]
    rng = np.random.default_rng(3)
    musica = np.zeros(int((total + 1) * SR))
    efectos = np.zeros_like(musica)

    # Música de fondo: marimba, bajo y percusión muy suaves todo el vídeo
    n_compas = int(np.ceil(total / COMPAS)) + 1
    for c in range(n_compas):
        t0 = c * COMPAS
        acorde = ACORDES[c % 4]
        tonos = [n + 12 for n in acorde] + [acorde[0] + 24]
        poner(musica, colchon([n + 12 for n in acorde], COMPAS + 0.4), t0, 0.07)
        for k, idx in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
            poner(musica, marimba(hz(tonos[idx])), t0 + k * PULSO / 2, 0.12 if k % 2 == 0 else 0.08)
        for b in (0, 2, 3.5):
            poner(musica, bajo(hz(acorde[0] - 12)), t0 + b * PULSO, 0.16)
        if c > 0:  # la percusión entra en el segundo compás
            for b in (0, 2):
                poner(musica, bombo(), t0 + b * PULSO, 0.26)
            for k in range(8):
                poner(musica, platillo(rng), t0 + (k + 0.5) * PULSO / 2, 0.025)

    # Efectos
    for e in datos["eventos"]:
        t, tipo = e["t"], e["tipo"]
        if tipo == "toque":
            poner(efectos, toque(rng), t, 0.35)
        elif tipo == "tecla":
            poner(efectos, tecla(rng), t, 0.12)
        elif tipo == "clic":
            poner(efectos, clic_raton(rng), t, 0.32)
        elif tipo == "tecla-pc":
            poner(efectos, tecla_pc(rng), t, 0.22)
        elif tipo == "aviso":
            poner(efectos, aviso(), t, 0.5)
        elif tipo == "exito":
            poner(efectos, exito(), t, 0.42)
        elif tipo == "claxon":
            poner(efectos, claxon(0.22), t, 0.38)
            poner(efectos, claxon(0.36), t + 0.33, 0.38)

    pista = musica * 0.55 + efectos
    pista = pista[: int(total * SR)]
    pista /= max(1e-9, np.max(np.abs(pista))) / 0.89
    n_out = int(1.2 * SR)
    pista[-n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    n_in = int(0.4 * SR)
    pista[:n_in] *= np.linspace(0, 1, n_in)

    estereo = np.repeat((pista * 32767).astype(np.int16)[:, None], 2, axis=1)
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(estereo.tobytes())


if __name__ == "__main__":
    main()
