Bonjour Monsieur, voici mon travail sur le projet de programmation web.

Mon travail comporte les fonctionnalités suivantes : 

Un initiateur crée la partie en définissant un nombre de joueurs, et le nombre de tours. Si plusieurs clients sont connectés au serveur, ils peuvent tous créer la partie tant que personne ne l'a fait.
Dès qu'un joueur crée une partie, les autres clients connectés au serveur ne peuvent désormais que rejoindre cette partie.
Le programme vérifie si le nom de joueur existe déjà et si le nombre de joueurs requis est atteint.

La création du terrain se déroule normalement en fonction du nombre de joueurs dès que tous les joueurs ont paramétré leurs créatures.

Une fois dans la partie, 1 seconde est réservée pour chaque créature. Chaque créature commence avec 3 d'hydratation et de satiété. 
Elle se déplace selon ces règles :
  - si ses niveaux vitaux sont suffisants (>=6) alors sont objectif est de se reproduire jusqu'à ce qu'elle meurt
  - sinon elle cherche constamment à se nourir
  - si ses niveaux sont à zéro, elle meurt

à la fin le programme détecte qui a le plus de créatures en vie pour désigner le vaincqueur.

Cependant, alors que j'ai essayé d'empêcher ce phénomène les créatures se rencontrent souvent sur une même case.
De plus, après la reproduction, certaines créatures se comportent d'une manière que je ne comprends pas. J'ai fait le nécessaire pour l'empêcher mais je ne vois toujours pas pourquoi cela arrive.

Merci d'avance pour le temps que vous allez consacrer à mon travail.
En vous souhaitant de joyeuses fêtes de fin d'année.
Thibaud Paulin.
