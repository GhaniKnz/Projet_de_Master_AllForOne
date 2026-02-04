# 📱 Instructions de Développement - AllForOne Mobile

## 🍎 DESIGN APPLE - RÈGLE FONDAMENTALE

> **TOUTE l'application doit TOUJOURS respecter le design Apple (iOS/Human Interface Guidelines)**

L'ensemble de l'interface doit être cohérent avec l'écosystème Apple :
- **Look & Feel iOS** : L'app doit ressembler à une app native iOS
- **Consistance** : Chaque écran, composant et interaction doit suivre les mêmes principes
- **Élégance** : Design épuré, minimaliste et premium
- **Intuitivité** : L'utilisateur doit se sentir familier immédiatement

---

## ⚠️ RÈGLES IMPÉRATIVES À RESPECTER

### 1. Délimitations de l'écran
- **TOUT le contenu doit rester DANS les limites de l'écran**
- Aucun élément ne doit déborder horizontalement
- Pas de scroll horizontal (sauf cas spécifiques comme des carousels)
- Utiliser `overflow-hidden` sur les conteneurs principaux
- Respecter les safe areas (notch iPhone, barre de navigation Android)

### 2. Responsive Design Obligatoire
- **L'application doit s'adapter à TOUTES les tailles d'écran mobile**
- Tester mentalement sur : iPhone SE (375px), iPhone 14 (390px), iPhone 14 Pro Max (430px)
- Utiliser des unités relatives (`%`, `vh`, `vw`, `rem`) plutôt que des pixels fixes
- Les images et médias doivent avoir `max-width: 100%`
- Les textes longs doivent avoir `overflow-hidden text-ellipsis` ou `line-clamp`

### 3. Classes Tailwind à privilégier
```
- w-full (largeur 100%)
- max-w-full (ne pas dépasser le parent)
- px-4 ou px-5 (padding horizontal standard)
- overflow-hidden (empêcher débordement)
- truncate (texte tronqué)
- line-clamp-2/3 (limiter les lignes)
- flex-shrink-0 / shrink-0 (empêcher rétrécissement)
- min-w-0 (permettre shrink des flex items)
```

### 4. Design Style Apple/iOS (OBLIGATOIRE)
- **Toujours respecter l'identité visuelle Apple**
- Coins arrondis généreux (`rounded-2xl`, `rounded-3xl`)
- Ombres douces (`shadow-soft`, `shadow-card`)
- Animations fluides (300ms, cubic-bezier)
- Backdrop blur pour les overlays (`backdrop-blur-xl`)
- Feedback tactile (`active:opacity-60`, `active:scale-95`)
- Typographie SF Pro style (system-ui, -apple-system)
- Minimum 14px pour le texte principal
- Icônes SF Symbols style (lignes fines, cohérentes)
- Espacements généreux et aérés
- Contrastes doux, pas de couleurs criardes

### 5. Safe Areas
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### 6. Popups et Modales
- Style "sheet" iOS : glisse depuis le bas sur mobile
- Maximum 85-90% de la hauteur de l'écran (`max-h-[85vh]`)
- Contenu scrollable à l'intérieur
- Header sticky avec boutons Annuler/OK
- Fermeture au clic en dehors

### 7. Navigation
- BottomNav fixe en bas avec safe area
- Hauteur de 70-80px avec padding bottom pour la barre système
- Laisser de l'espace (`pb-24`) pour le contenu au-dessus de la nav

### 8. Thème Nebula (Mode sombre)
- Background : `#0d0b1e`
- Surface : `#1a1730`
- Primary : `#a78bfa` (violet)
- Accent : `#c084fc` (violet clair)

---

## 📋 Checklist avant chaque modification

- [ ] Le contenu reste dans l'écran ?
- [ ] Pas de scroll horizontal ?
- [ ] Fonctionne sur petit écran (375px) ?
- [ ] Les textes longs sont tronqués ?
- [ ] Les images ont max-width: 100% ?
- [ ] Les safe areas sont respectées ?
- [ ] Le design est cohérent avec iOS ?

---

## 🚫 À NE JAMAIS FAIRE

1. ❌ Largeurs fixes en pixels (`w-[500px]`)
2. ❌ Marges/paddings excessifs qui poussent le contenu hors écran
3. ❌ Textes qui débordent sans `truncate` ou `line-clamp`
4. ❌ Images sans contrainte de taille max
5. ❌ Popups qui dépassent la hauteur de l'écran
6. ❌ Oublier le padding bottom pour la navigation
7. ❌ Ignorer les safe areas sur iPhone
8. ❌ **S'éloigner du design Apple/iOS**
9. ❌ Utiliser des styles Android ou Material Design
10. ❌ Créer des composants visuellement incohérents avec le reste de l'app

---

*Ce fichier doit être lu à chaque nouvelle requête de développement.*
*⚠️ Le design Apple est la référence absolue pour cette application.*
