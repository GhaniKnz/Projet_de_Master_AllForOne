import bcrypt from 'bcryptjs'
import { ensureUser, UserModel } from '../models/user.js'
import { FeedPostModel } from '../models/feedPost.js'

const seedUsers = [
  {
    username: 'demo-user',
    email: 'demo@example.com',
    displayName: 'Demo Player',
    handle: '@demo',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Demo+Player&background=2563eb&color=ffffff',
    bannerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
    bio: 'Explorateur UNO et gamer social.',
    xp: 840,
    level: 8
  },
  {
    username: 'alex-martin',
    email: 'alex@example.com',
    displayName: 'Alex Martin',
    handle: '@alexm',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Martin&background=10b981&color=ffffff',
    bannerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
    bio: 'Toujours partant pour un UNO No Mercy.',
    xp: 1250,
    level: 12
  },
  {
    username: 'team-galaxy',
    email: 'team-galaxy@example.com',
    displayName: 'Team Galaxy',
    handle: '@teamgalaxy',
    avatarUrl: 'https://ui-avatars.com/api/?name=Team+Galaxy&background=6366f1&color=ffffff',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80',
    bio: 'Organisation de tournois & events communautaires.',
    xp: 2200,
    level: 18
  },
  {
    username: 'lina-om',
    email: 'lina@example.com',
    displayName: 'Lina Om',
    handle: '@lina',
    avatarUrl: 'https://ui-avatars.com/api/?name=Lina+Om&background=f97316&color=ffffff',
    bannerUrl: 'https://images.unsplash.com/photo-1526402464710-759ec2e1e87d?auto=format&fit=crop&w=1600&q=80',
    bio: 'Fan de puzzles et de classements UNO.',
    xp: 540,
    level: 6
  }
]

const seedPosts = [
  {
    authorId: 'alex-martin',
    content:
      "Quelqu'un pour une UNO No Mercy ? J'ai un creneau de 15 min et j'ai besoin de lancer une revanche !",
    media: [],
    likesCount: 42,
    commentsCount: 3
  },
  {
    authorId: 'team-galaxy',
    content:
      'Tournoi Derocher ce soir a 21h30 ! XP x2 pour tous les participants et un badge exclusif a debloquer.',
    media: [],
    likesCount: 128,
    commentsCount: 5
  },
  {
    authorId: 'lina-om',
    content: 'Premier top 10 dans le classement UNO ! Merci a l equipe pour les matchs dentrainement hier soir !',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1533237264985-ee6c93d41713?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
        width: 1200,
        height: 800
      }
    ],
    likesCount: 201,
    commentsCount: 12
  }
]

export async function seedInitialData() {
  const passwordHash = await bcrypt.hash('Password123!', 10)

  for (const user of seedUsers) {
    const created = await ensureUser(user)
    if (!created.passwordHash) {
      created.passwordHash = passwordHash
      await created.save()
    }
  }

  const count = await FeedPostModel.estimatedDocumentCount()
  if (count === 0) {
    await FeedPostModel.insertMany(
      seedPosts.map((post) => ({
        ...post
      }))
    )
    const demo = await UserModel.findOne({ username: 'demo-user' })
    if (demo && !demo.friends.includes('alex-martin')) {
      demo.friends.push('alex-martin', 'lina-om')
      await demo.save()
    }
  }
}

