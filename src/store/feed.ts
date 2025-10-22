import { create } from 'zustand'

export type FeedPost = {
  id: string
  author: {
    name: string
    handle: string
    avatar: string
    level: number
  }
  createdAt: string
  content: string
  image?: string
  likes: number
  liked: boolean
  comments: number
  shares: number
}

export type Trend = {
  id: string
  title: string
  description: string
  growth: string
}

type FeedState = {
  posts: FeedPost[]
  trends: Trend[]
  toggleLike: (id: string) => void
  addPost: (content: string) => void
}

const initialPosts: FeedPost[] = [
  {
    id: '1',
    author: { name: 'Alex Martin', handle: '@alexm', avatar: 'AM', level: 12 },
    createdAt: 'Il y a 5 min',
    content: 'Quelqu’un pour une UNO No Mercy ? J’ai un créneau de 15 min et j’ai besoin de lancer une revanche 😅',
    likes: 42,
    liked: false,
    comments: 18,
    shares: 3
  },
  {
    id: '2',
    author: { name: 'Team Galaxy', handle: '@teamgalaxy', avatar: 'TG', level: 21 },
    createdAt: 'Il y a 1 h',
    content: 'Tournoi Dérocher ce soir à 21h30 ! On aligne les gains XP x2 pour tous les participants et un badge exclusif à débloquer.',
    likes: 128,
    liked: true,
    comments: 64,
    shares: 12
  },
  {
    id: '3',
    author: { name: 'Lina', handle: '@lina.om', avatar: 'L', level: 7 },
    createdAt: 'Il y a 3 h',
    content: 'Premier top 10 dans le classement UNO 🏆 Merci à l’équipe pour les matchs d’entraînement hier soir !',
    image: 'https://images.unsplash.com/photo-1533237264985-ee6c93d41713?auto=format&fit=crop&w=900&q=80',
    likes: 201,
    liked: false,
    comments: 44,
    shares: 28
  }
]

const initialTrends: Trend[] = [
  { id: 'uno', title: '#UNO', description: '2 540 joueurs en ce moment', growth: '+18%' },
  { id: 'derocher', title: '#Dérocher', description: 'Tournoi “Cascadeurs” en direct', growth: '+34%' },
  { id: 'no-mercy', title: '#NoMercy', description: 'Nouvelles cartes dévoilées', growth: '+12%' }
]

export const useFeedStore = create<FeedState>((set) => ({
  posts: initialPosts,
  trends: initialTrends,
  toggleLike: (id) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? Math.max(0, post.likes - 1) : post.likes + 1
            }
          : post
      )
    })),
  addPost: (content) =>
    set((state) => ({
      posts: [
        {
          id: `${Date.now()}`,
          author: { name: 'Vous', handle: '@vous', avatar: 'VO', level: 5 },
          createdAt: 'À l’instant',
          content,
          likes: 0,
          liked: false,
          comments: 0,
          shares: 0
        },
        ...state.posts
      ]
    }))
}))
