# 🥂 Tchin ! — Jeux de soirée entre amis

Application mobile (PWA) à installer sur ton téléphone, avec **plus de 1 000 cartes** pour animer tes soirées.
Elle fonctionne **hors ligne** une fois ouverte une première fois.

## 🎮 Les jeux

| Jeu | Principe |
|---|---|
| 🎉 **La Totale** | Le mix ultime avec vos prénoms : défis, duels, catégories, **virus** (règles temporaires), + des cartes de tous les autres jeux |
| 🙊 **Je n'ai jamais** | Ceux qui l'ont déjà fait boivent |
| 👉 **Qui pourrait…** | À 3, tout le monde pointe du doigt, le plus désigné boit |
| 🎯 **Action ou Vérité** | Tour par tour, avec le prénom de chaque joueur |
| ⚖️ **Tu préfères** | Deux choix impossibles, la minorité boit |
| 🔥 **Sur le grill** | Un joueur au centre, 4 questions d'affilée |

## 🌶️ Les ambiances (cumulables)

😄 **Chill** · 💀 **Hard** · 🍻 **Alcool** · 💞 **Couple** · 🌶️ **Hot 🔞** (confirmation +18 demandée)

## 🔁 Jamais les mêmes cartes

- Chaque carte vue est mémorisée sur le téléphone : elle ne revient **pas** tant que toutes les cartes de la catégorie n'ont pas été jouées.
- Les prénoms et le nombre de gorgées sont tirés au hasard à chaque fois, donc une même carte n'est jamais vraiment identique.
- Réglages → « Réinitialiser l'historique » pour tout remettre en jeu.

## ⚙️ Réglages

- Unité de pénalité : **gorgées**, **shots** ou **gages** (version sans alcool, les textes s'adaptent)
- Vibrations, écran toujours allumé pendant la partie

## 📲 Mettre l'appli sur ton téléphone

1. Fusionne cette branche dans `main`, puis sur GitHub : **Settings → Pages → Source : GitHub Actions**.
   Le workflow `.github/workflows/pages.yml` publie l'appli à l'adresse
   `https://<ton-pseudo>.github.io/App-soiree-/`.
2. Ouvre cette adresse sur ton téléphone :
   - **iPhone** (Safari) : bouton Partager ⬆️ → « Sur l'écran d'accueil »
   - **Android** (Chrome) : menu ⋮ → « Installer l'application »

L'icône 🥂 apparaît alors comme une vraie appli, en plein écran.

## ✍️ Ajouter tes propres cartes

Tout est dans [`js/data.js`](js/data.js), rangé par jeu puis par ambiance. Variables disponibles :

- `{p}` : un joueur au hasard, `{p2}` : un autre joueur
- `{1}` à `{6}` : nombre de gorgées (affiché selon l'unité choisie)
- Tu préfères : `"Choix A || Choix B"`

## 🧪 Tester en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

---
⚠️ L'abus d'alcool est dangereux pour la santé. Personne n'est obligé de boire, le mode « gages » est là pour ça.
