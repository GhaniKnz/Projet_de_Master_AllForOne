import { Router } from 'express'

export const gamesRouter = Router()

const CATALOG = [
  {
    id: 'uno',
    name: 'UNO Classique',
    playerRange: [2, 6],
    modes: ['realtime'],
    summary: 'Jeu de cartes classique',
    highlight: 'Matchs rapides'
  },
  {
    id: 'uno-no-mercy',
    name: 'UNO No Mercy',
    playerRange: [2, 6],
    modes: ['realtime'],
    summary: 'Variante compétitive',
    highlight: '+6/+10 & 7-0'
  },
  {
    id: 'derocher',
    name: 'Dérocher',
    playerRange: [2, 4],
    modes: ['realtime', 'turn-based'],
    summary: 'Adresse et stratégie'
  }
]

gamesRouter.get('/', (_req, res) => {
  return res.json({ items: CATALOG })
})

