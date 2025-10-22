import React from 'react'
import Card from '../components/Card'
import Tabs from '../components/Tabs'
import { ShoppingBag, Plus, Sparkles, ShieldCheck } from 'lucide-react'

const CATEGORIES = ['En vedette', 'Avatars', 'Thèmes', 'Boosts']

const ITEMS = [
  {
    id: 'avatar-dragon',
    title: 'Avatar Dragon animé',
    description: 'Une animation exclusive pour fêter votre série de victoires.',
    price: '1 200 pts',
    category: 'Avatars',
    featured: true
  },
  {
    id: 'theme-nebula',
    title: 'Thème Nebula',
    description: 'Personnalise ton profil avec un fond inspiré des galaxies.',
    price: '900 pts',
    category: 'Thèmes',
    featured: true
  },
  {
    id: 'boost-xp',
    title: 'Boost XP x2 (24h)',
    description: 'Double l’XP gagnée pendant 24 heures sur tous les jeux.',
    price: '4,99 €',
    category: 'Boosts',
    featured: false
  },
  {
    id: 'shield',
    title: 'Bouclier Fair-Play',
    description: 'Protège ta série classée contre une défaite inattendue.',
    price: '1 800 pts',
    category: 'Boosts',
    featured: false
  }
]

export default function Boutique() {
  const [category, setCategory] = React.useState(CATEGORIES[0])

  const filteredItems =
    category === 'En vedette'
      ? ITEMS.filter((item) => item.featured)
      : ITEMS.filter((item) => item.category === category)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/15 via-white to-accent/10 p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted">Boutique</p>
            <h1 className="mt-2 text-2xl font-semibold text-txt">Débloquez des récompenses uniques</h1>
            <p className="mt-3 text-sm text-muted">
              Utilisez vos points gagnés en jouant ou passez à la caisse pour obtenir des items exclusifs et personnaliser votre expérience.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm text-muted shadow-soft">
            <ShoppingBag className="h-5 w-5 text-primary" />
            1 530 pts disponibles
            <button className="rounded-full border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20 focus-ring" aria-label="Acheter des points">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <Tabs items={CATEGORIES} current={category} onChange={setCategory} />

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">{item.category}</span>
              {item.featured ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-4 w-4" />
                  En vedette
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold text-txt">{item.title}</h2>
            <p className="text-sm text-muted">{item.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <p className="text-base font-semibold text-txt">{item.price}</p>
              <button className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring">
                Ajouter au panier
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex items-center gap-3 border border-accent/40 bg-accent/10 text-accent">
        <ShieldCheck className="h-6 w-6" />
        <div>
          <p className="text-sm font-semibold">Paiements sécurisés</p>
          <p className="text-xs text-accent/80">Toutes les transactions sont protégées et gérées par les stores officiels Apple/Google.</p>
        </div>
      </Card>
    </div>
  )
}
