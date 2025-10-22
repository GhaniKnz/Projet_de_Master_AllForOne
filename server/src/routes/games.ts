import { Router } from 'express'
import type { Request, Response } from 'express'

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
    summary: 'Variante competitive',
    highlight: '+6/+10 & 7-0'
  },
  {
    id: 'derocher',
    name: 'Derocher',
    playerRange: [2, 4],
    modes: ['realtime', 'turn-based'],
    summary: 'Adresse et strategie'
  }
]

gamesRouter.get('/', (_req: Request, res: Response) => {
  return res.json({ items: CATALOG })
})
