# Specification Fonctionnelle - Module "Jeux" de AllForOne

## 1. Apercu du module "Jeux"

Le module Jeux de l'application mobile AllForOne permet aux utilisateurs de jouer a des jeux multijoueurs en ligne tout en facilitant les interactions sociales (messagerie, invitations, etc.). Inspire de la plateforme Plato, AllForOne integre au lancement trois jeux populaires : UNO, UNO - No Mercy (une variante plus agressive d'UNO) et un jeu original nomme Derocher. Ce cahier des charges detaille les fonctionnalites generales du module Jeux, les modes de jeu disponibles, la creation et la gestion des parties, les regles propres a chaque jeu, la gestion des connexions des joueurs, ainsi que les systemes de progression et d'interactions sociales.

## 2. Fonctionnalites generales du module Jeux

- **Acces et navigation** : le module Jeux est accessible depuis la barre de navigation principale de l'application. Une icone dediee conduit l'utilisateur a la section Jeux. Depuis cet ecran, le joueur peut choisir un jeu ou rejoindre une partie en cours. Chaque jeu disponible est presente avec son icone et une courte description.
- **Interface de la section Jeux** : l'ecran principal liste les jeux avec des categories ou filtres (par exemple : Cartes, Rapide, Tour par tour). Chaque entree affiche le nombre de joueurs en ligne sur ce jeu et les options de jeu disponibles (mode rapide, creation de partie, etc.). Une barre de recherche permet de retrouver un jeu par nom.
- **Recherche de parties et filtres** : le joueur peut parcourir les parties publiques en cours ou en attente de joueurs. Des filtres permettent de trier les parties par jeu, nombre de joueurs, langue, niveau des joueurs (dans le cas des parties classees) ou mode (temps reel vs asynchrone).
- **Rejoindre une partie** : en un tap, un joueur peut rejoindre une partie publique disponible (si un emplacement est libre) ou envoyer une demande pour rejoindre une partie privee (necessitant l'approbation de l'hote ou un mot de passe).
- **Notifications** : le module envoie des notifications push contextuelles (invitation a une partie, debut imminent, rappel de tour en mode asynchrone). Les notifications respectent les reglages de l'utilisateur (activation ou desactivation par type d'evenement).
- **Messagerie integree** : une fonction de chat in-game est disponible dans chaque partie, permettant aux joueurs de communiquer en temps reel. Le chat supporte le texte et les emojis, propose des filtres de moderation et des options de signalement. En dehors des parties, des salons de discussion ou messages prives permettent de coordonner les parties entre amis.

## 3. Modes de jeu : temps reel vs tour par tour

AllForOne supporte deux modes de deroulement des parties selon le jeu.

- **Mode temps reel (synchrone)** : les joueurs jouent en meme temps, dans une session continue. Ce mode convient aux jeux rapides ou tous les participants doivent etre connectes simultanement. UNO et UNO - No Mercy se jouent en temps reel avec un temps de tour configurable (ex. 20 secondes). Depasser la limite applique une action par defaut (piocher automatiquement une carte dans UNO).
- **Mode tour par tour (asynchrone)** : les joueurs jouent a tour de role sans obligation de connexion simultanee. Des notifications previennent quand c'est au tour d'un joueur. Le jeu Derocher peut etre joue en mode synchrone ou asynchrone, avec une limite de temps etendue (ex. quelques heures). Si aucun coup n'est joue dans le delai, une penalite ou un abandon automatique s'applique.

Chaque fiche de jeu precise les modes disponibles. L'interface de creation et de recherche filtre clairement les parties en fonction du mode choisi.

## 4. Creation de parties (privees, publiques, classees)

Lors de la creation d'une partie, l'utilisateur configure plusieurs parametres :

- **Type de partie** :
  - *Privee* : visible uniquement par invitation. L'hote invite des amis via la liste d'amis ou partage un code ou mot de passe. La partie n'apparait pas dans la liste publique.
  - *Publique* : ouverte a tous, listee dans le navigateur de parties. Mode non classe sans impact sur les statistiques de classement.
  - *Classee* : publique et competitive. Le matchmaking impose des regles pour equilibrer (niveau similaire, nombre de joueurs fixe). La partie ne demarre que lorsque tous les joueurs requis sont presents.
- **Selection du jeu et du mode** : choix entre UNO, UNO No Mercy ou Derocher. Seuls les modes compatibles sont affiches (UNO uniquement temps reel, Derocher temps reel ou tour par tour).
- **Nombre de joueurs** : configuration du nombre minimum et maximum selon le jeu (UNO/UNO No Mercy : 2 a 6 joueurs, defaut a 4 ; Derocher : 2 a 4 joueurs, defaut a 2). Une partie publique ou classee reste en salle d'attente tant que le minimum n'est pas atteint.
- **Options et variantes** : options specifiques a chaque jeu (ex. activer ou desactiver le cumul des +2/+4 pour UNO classique, niveaux de difficulte pour Derocher). Pour No Mercy, certaines options sont verrouillees (cumul toujours actif).

Une fois les parametres confirmes, l'hote lance la creation. En partie privee, il peut inviter des amis. En partie publique ou classee, la salle devient visible et le matchmaking peut y affecter d'autres joueurs. Le bouton "Lancer la partie" reste inactif tant que le seuil minimal de joueurs n'est pas atteint.

## 5. Systeme de matchmaking automatique

Le module Jeux propose un matchmaking automatique pour remplir rapidement les parties, en particulier pour les modes rapides et classes.

- **Matchmaking rapide** : bouton "Jouer immediatement" depuis l'ecran principal ou la fiche d'un jeu. Le systeme rejoint une partie publique existante correspondant aux criteres ou en cree une nouvelle. En mode classe, le matchmaking privilegie des adversaires de niveau voisin. En mode loisir, il cherche un demarrage rapide.
- **Invitation d'amis** : a tout moment un joueur peut inviter un ami via la liste d'amis. L'invitation reserve un slot pour l'ami (limite pour ne pas transformer une partie publique en privee deguisee).
- **Groupes et matchmaking d'equipe** : le systeme supporte la constitution d'equipes (extension future pour des jeux en 2v2, etc.). Une escouade peut rejoindre la file ensemble et sera appariee a une equipe de niveau similaire.
- **Algorithme d'appariement** : en classe, un rating type ELO equilibre les parties. En non classe, l'appariement privilegie la rapidite tout en tenant compte des parametres (region, langue, latence).
- **Temps d'attente et notifications** : si la partie ne remplit pas instantanement, l'interface affiche une estimation ("Recherche de joueurs... 30 s") et permet d'annuler. Des notifications previennent lorsque la partie est prete, utile si le joueur navigue ailleurs.

> Schema 1 (non inclus ici) illustre les flux de creation/recherche de parties, matchmaking rapide et invitations.

## 6. Deroulement et regles de chaque jeu

Cette section decrit la logique de jeu pour UNO, UNO - No Mercy et Derocher. L'application reproduit fidelement les regles, avec les ajustements necessaires au jeu en ligne.

### 6.1 UNO (Classique)

- **Vue d'ensemble** : jeu de cartes de 2 a 10 joueurs. Chaque joueur commence avec 7 cartes. Le talon est initie avec une carte retournee, la pioche contient le reste des 108 cartes. Les tours s'enchainent dans le sens horaire par defaut.
- **Tour de jeu** : a son tour, un joueur doit jouer une carte correspondant en couleur ou en numero/symbole a la carte du talon. S'il ne peut pas, il pioche une carte et peut la jouer immediatement si elle est valide. Option variante : "piocher jusqu'a jouer" (desactivee par defaut en UNO classique, activee en No Mercy).
- **Cartes speciales** :
  - Inversion : change le sens du jeu.
  - Passe ton tour : le joueur suivant saute son tour.
  - +2 : le joueur suivant pioche 2 cartes et passe.
  - Joker : change la couleur de jeu.
  - +4 : force le joueur suivant a piocher 4 cartes et passer. Jouable uniquement si le joueur n'a pas de carte de la couleur demandee (verification automatique). Regle de contestation geree par l'application (penalite 4 cartes pour le fraudeur ou +2 supplementaires pour le contestataire si contestation infondee).
- **Annonce "UNO"** : lorsqu'un joueur pose son avant-derniere carte, il doit appuyer sur le bouton "UNO" avant la fin de son tour. Faute d'annonce, un adversaire peut appuyer sur "Contre-UNO" dans un delai court, ce qui inflige une penalite de 2 cartes. L'interface affiche clairement les boutons contextuels.
- **Conditions de victoire** : par defaut, la partie se joue en une manche (premier a se defausser gagne). Optionnellement, un mode score cumulatif jusqu'a 500 points est disponible. L'application calcule automatiquement les points restants dans les mains adverses et attribue le score au vainqueur.
- **Interface** : main du joueur, carte du talon, nombre de cartes des adversaires, indicateurs de couleur et surlignage du joueur actif. Chat integre et animations (sons, effets sur +2/+4, etc.).

### 6.2 UNO - No Mercy

Variante survitaminee d'UNO pour 2 a 6 joueurs, avec un paquet elargi (environ 168 cartes) et des regles plus agressives.

- **Regle de cumul permanente** : le cumul des cartes "+X" est toujours actif et inclut +2, +4, +6, +10 et Wild Reverse Draw 4. Le joueur suivant doit piocher la somme totale lorsqu'il ne peut plus cumuler.
- **Nouvelles cartes action** :
  - +6 (Joker +6) : choix de couleur et pioche de 6 cartes.
  - +10 (Joker +10) : choix de couleur et pioche de 10 cartes.
  - Passer tout le monde : tous les autres joueurs passent leur tour, le joueur rejoue.
  - Defausse totale : se defausser de toutes les cartes d'une meme couleur.
  - Joker Inversion +4 : inverse le sens puis impose +4 au nouveau joueur suivant (participe au cumul).
  - Roulette des couleurs : le joueur choisit une couleur ; le suivant pioche jusqu'a obtenir une carte de cette couleur et conserve tout.
- **Regles 7-0 (echange de main)** : jouer un 7 oblige a echanger sa main avec un joueur choisi (sauf joueur a UNO si la regle l'interdit). Jouer un 0 fait tourner toutes les mains dans le sens du jeu. L'interface gere les selections ou echanges automatiques.
- **Regle "Pitie" (Mercy)** : au-dela de 25 cartes en main, un joueur est elimine. Les cartes eliminees ne retournent pas immediatement dans la defausse. La victoire peut etre obtenue en se debarrassant de toutes ses cartes ou en etant le dernier joueur non elimine.
- **Deroulement** : mecanique identique a UNO classique mais avec enchainement d'effets multiples. La regle "UNO" reste obligatoire avec la meme penalite. Le jeu remelange la defausse pour realimenter la pioche si besoin.
- **Interface** : visuel thematique "No Mercy", icones explicites pour chaque carte unique, messages de journal (ex. "Alice a elimine Bob - 25 cartes en main").

### 6.3 Derocher

Jeu original inspire de mecaniques d'adresse (type Jenga). Jouable en mode temps reel ou tour par tour.

- **But** : marquer le plus de points en retirant des pieces sans effondrer la structure ou rester le dernier joueur non elimine selon le mode.
- **Mise en place** : generation aleatoire d'une structure de "rochers" avec valeurs de points. Possibilite de blocs de tailles ou couleurs differentes.
- **Tour de jeu** : le joueur selectionne un bloc et tente de le retirer via interaction tactile. Un moteur physique simplifie determine la stabilite residuelle. Retrait reussi = points gagnes. Limite de temps configurable en mode synchrone (ex. 30 secondes).
- **Chutes partielles** : si des elements tombent partiellement, le joueur recoit une penalite de points (ex. -1 par bloc tombe). Les blocs tombes sont retires.
- **Effondrement total** :
  - *Variante Survie/Elimination* : le joueur ayant provoque l'effondrement perd, les survivants gagnent (eventuellement ex quo).
  - *Variante Score* : l'effondrement inflige une lourde penalite (ex. -10). La partie continue pour un nombre de manches defini ou se termine si la structure est injouable.
- **Fin de partie** : en mode survie, des qu'il ne reste qu'un joueur actif ; en mode score, au terme des manches ou si aucune piece n'est retirable. L'ecran de resultats affiche scores, vainqueurs et statistiques.
- **Interface** : vue 2D/3D simple avec possibilite de rotation, affichage des valeurs de blocs, indicateur de tour, bouton "Retirer", historique des coups et chat en jeu. Un tutoriel facultatif explique les risques et strategies.

## 7. Gestion des connexions et deconnexions

- **Reconnexion** : en cas de coupure reseau, le joueur dispose d'une fenetre (30 a 60 secondes) pour revenir. La partie peut se mettre en pause si le mode le permet ou appliquer une IA ou substitution. En mode tour par tour, la reconnexion peut se faire plus tard tant que la limite de temps n'est pas depassee.
- **Abandon volontaire** : confirmation requise. En UNO/No Mercy, l'abandon equivaut a une defaite ; la partie continue pour les autres (remplacement par IA optionnel). En classe, des penalites sur le rating s'appliquent. En Derocher, l'abandon peut entrainer elimination (mode survie) ou retrait du score (mode score).
- **Expulsion automatique** : inactivite prolongee declenche des avertissements puis un forfait (ex. deux tours consecutifs passes en UNO).
- **Hote qui quitte** : avant le debut, la salle est fermee. Apres le lancement, la partie continue et un nouvel hote est designe si necessaire (pour permettre les revanches).
- **Migration d'hote** : en architecture P2P, transfert transparent de l'hebergement vers un autre joueur.
- **Fin prematuree** : si 0 ou 1 joueur restent, la partie se termine immediatement et le joueur restant gagne par defaut.
- **Reprise de partie** : a la reconnexion de l'application, un bouton "Reprendre la partie en cours" est propose si une session est toujours active.

## 8. Score, progression et recompenses

- **Points d'experience (XP)** : chaque partie rapporte de l'XP selon resultat et mode. UNO : 50 XP victoire / 20 XP defaite, UNO No Mercy legerement superieur (ex. 60 XP victoire), Derocher selon score ou classement. XP global cumule tous jeux confondus.
- **Niveaux de joueur** : progression de niveau basee sur l'XP total, avec gains croissants. Les niveaux debloquent badges, titres ou simples marqueurs de progression.
- **Classements (leaderboards)** :
  - Classements par jeu (mode classe) bases sur un score Elo/MMR. Affichage hebdomadaire ou saisonnier.
  - Classement global XP mettant en avant les joueurs les plus actifs.
- **Systeme de rang/MMR** : ligues (Bronze a Diamant, par exemple) derivees du MMR. Saisons regulieres avec reinitialisation partielle et recompenses de fin de saison.
- **Badges et recompenses** : succes a debloquer (ex. "Champion UNO" pour 100 victoires, "Survivant No Mercy" pour une victoire par elimination totale, "Cascadeur" pour 10 blocs retires sans chute). Certains badges peuvent octroyer des bonus d'XP ponctuels. Possibilite de succes caches.
- **Defis et missions** : objectifs quotidiens ou hebdomadaires (ex. "Gagner 3 parties d'UNO aujourd'hui", "Reussir un combo +4 en No Mercy", "Retirer 5 blocs sans chute cette semaine"). Recompenses : XP bonus, badges temporaires, monnaie virtuelle potentielle.
- **Recompenses de fin de partie** : ecran de fin resumant resultat, XP gagne, progression de niveau, points classes, defis accomplis, statistiques anecdotiques (nombre de +4 joues, duree de la partie, etc.).
- **Economie et boutique (hors perimetre)** : possibilite future d'ajouter une boutique cosmetique alimentee par une monnaie gagnee en jeu, connectee aux systemes de progression.

## 9. Interactions sociales et experience communautaire

- **Chat in-game** : canal texte temps reel par partie, avec messages rapides predefinis, bulles contextuelles et filtres anti-insultes. Possibilite de masquer ou signaler.
- **Liste d'amis et groupes** : integration avec la liste d'amis, indication du statut (en ligne, en partie, jeu en cours). Creation de groupes ou clubs avec chat persistant pour organiser des sessions.
- **Retour d'XP et recapitulatif** : ecran de resultats partage affichant classement final, XP, progression de rang, defis, statistiques cles.
- **Notation de la partie et kudos** : a la fin, les joueurs peuvent noter la partie (etoiles ou pouce) et attribuer des kudos aux coequipiers ou adversaires. Pistes pour detecter les comportements toxiques via signalements.
- **Invitations et rendez-vous** : planification de sessions ("On joue a 21 h ?"), avec rappels via notifications a l'heure convenue.
- **Profil de joueur** : accessible depuis le lobby ou la partie, montrant avatar, badges, niveau, statistiques cles, options sociales (ajouter, mute, signaler).
- **Retours communautaires** : lien vers un forum ou une page feedback pour recueillir suggestions et rapports de bug.

Chaque partie sur AllForOne vise ainsi a etre une experience sociale complete, inspiree de l'ambiance conviviale de Plato.

## Sources

- Regles officielles UNO (Mattel)
- Regles UNO Show 'Em No Mercy
- Fonctionnalites sociales de l'application Plato
