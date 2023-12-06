const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use('/public', express.static('public', { 'extensions': ['css'] }));

app.use(express.static('public'));

app.get('/', (request, response) => {
    response.sendFile('Projet.html', {root: __dirname});
});

var nbJoueurs;
var nbTours;
var cases = [];
const couleurs = ["#FF003B", "#C400FF", "#F1C40F", "#FF8BF1"];
var joueurs = [];
var c1 = [];
var c2 = [];
var c3 = [];
var c4 = [];
var toutesCréatures = [c1, c2, c3, c4];
var jeton = -1;
var positionsPossibles = [];
for (l=0; l < 13; l++) {
    for (c=0; c < 13; c++){
        positionsPossibles.push([l,c]);
    }
}
console.log(positionsPossibles);
  
server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

function nbAleatoire() {
    var x = Math.random() * 100;
    if (x < 15){
       return 1;
    }
    else if (x < 50){
       return 2;
    }
    else{
       return 3;
    }
}

function deplacer(c){
    var position = c.get("pos");
    var reproduction = c.get("reproduction");
    var perception = c.get("perception");
    var force = c.get("force");
    var voisinsPossibles = [];
    if(perception >= 1){
        voisinsPossibles.push([[0,1],[0,-1],[1,0],[1,1],[-1,0],[-1,-1]]);
    }
    if(perception >= 2){
        voisinsPossibles.push([[0,2],[1,2],[2,2],[2,1],[2,0],[1,-1],[0,-2],[-1,-2],[-2,-2],[-2,-1],[-2,0],[-1,1]]);
    }
    if(perception >= 3){
        voisinsPossibles.push([[0,3],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-3],[-2,-3],[-3,-3],[-3,-2],[-3,-1],[-3,0],[-2,1],[-1,2]]);
    }
    if(perception >= 4){
        voisinsPossibles.push([[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]);
    }
    if(perception == 5){
        voisinsPossibles.push();
    }
    var voisins = [];
    for(i = 0; i<6; i++){
        if(positionsPossibles.includes([position[0]+voisinsPossibles[i][0],position[1]+voisinsPossibles[i][1]])){
            voisins.push
        }
    }
    
    //aucune intéressante -> random, 1 intéressante -> y aller, plusieurs intéressantes -> aller dans la première vue
    //définir la priorité : mager boire ou se reproduire
    //aller dans la case prioritaire ou continuer à la chercher
    //traiter cas d'une case occupée
    //faire un switch sur la couleur de la case pour augmenter fonctions vitales
    //décrémenter fonctions vitales
    //une des fonctions à zéro -> mort
    //POUR CHAQUE CHANGEMENT D'ÉTAT FAIRE io.emit
}

function partie(){
    for (i = 0; i < 169; i ++){     // génération de la couleur des cases
        let couleur = nbAleatoire();
        switch (couleur){
            case 1:
                cases[i] = "#3498DB"; // eau
                break;

            case 2:
                cases[i] = "#8BC34A"; // prairie
                break;

            case 3:
                cases[i] = "#707B7C"; // rocher
                break;
        }
    }
    io.emit('cases', {'cases':cases, 'nbJoueurs':nbJoueurs}); // envoi des informations du terrain
    for (i = 0; i < nbJoueurs; i++){ // création de la liste de créatures de chaque joueur
        let M = new Map(); 
        let F = new Map();
        let pos = [];          
        switch (i){
            case 0:
                pos = "#g78";
                break;
            case 1:
                pos = "#g90";
                break;
            case 2:
                pos = "#g162";
                break;
            case 3:
                pos = "#g6";
                break;
        }
        M.set("numCreateur",i);
        M.set("sexe","M");
        M.set("couleur", couleurs[i]);
        M.set("reproduction", joueurs[i].get("reproduction"));
        M.set("perception", joueurs[i].get("perception"));
        M.set("force", joueurs[i].get("force"));
        M.set("satiete", 10);
        M.set("hydratation", 10);
        M.set("idG", pos);
        F.set("numCreateur",i);
        F.set("sexe","F");
        F.set("couleur", couleurs[i]);
        F.set("reproduction", joueurs[i].get("reproduction"));
        F.set("perception", joueurs[i].get("perception"));
        F.set("force", joueurs[i].get("force"));
        F.set("satiete", 10);
        F.set("hydratation", 10);
        F.set("idG", pos);
        toutesCréatures[i].push(M);
        toutesCréatures[i].push(F);
        io.emit('nouvellePosition', nbJoueurs);
    }
    var reproductionPossible = 0;
    //attendre 0.5 sec
    for (i = 1; i < nbTours; i ++){
        if(i == 3){
            reproductionPossible = 1;
        }
        deplacer(c1);
        //attendre 1 sec
        jeton ++;
        if(jeton == joueurs.length){
            jeton = 0;
        }
        else{
            deplacer(c2);
            //attendre 1 sec
            jeton ++;
            if(jeton == joueurs.length){
                jeton = 0;
            }
            else{
                deplacer(c3);
                //attendre 1 sec
                jeton ++;
                if(jeton == joueurs.length){
                    jeton = 0;
                }
                else{
                    deplacer(c4);
                    //attendre 1 sec
                    jeton = 0;
                }
            }
        }
        //la dernière espèce en vie gagne
    }
    //l'espèce avec la plus grande population gagne
}

io.on('connection', (socket) => {

    socket.on('creation', data => {
        console.log(data.nom+" crée la partie");
        let joueur = new Map();
        nbJoueurs = data.nbJoueurs;
        nbTours = data.nbTours;
        joueur.set("num", 0);
        joueur.set("name", data.nom);
        joueur.set("reproduction", data.reproduction);
        joueur.set("perception", data.perception);
        joueur.set("force", data.force);
        console.log(joueur);
        joueurs.push(joueur);
        if(data.nbJoueurs == 1){
            jeton = 0;
            socket.emit('messageServeur', "La partie solo commence");
            partie();
        }
        else{
            socket.emit('messageServeur', "1/"+nbJoueurs+" joueurs. En attente...");
            socket.broadcast.emit('creation',joueur);
        }
    });

    socket.on('entree', data => {
        if (joueurs.length < nbJoueurs)
            if (!joueurs.some(joueur => joueur.get('name') === data.nom)) {
                var joueur = new Map();
                joueur.set("num", joueurs.length);
                joueur.set("name", data.nom);
                joueur.set("reproduction", data.reproduction);
                joueur.set("perception", data.perception);
                joueur.set("force", data.force);
                console.log(joueur);
                joueurs.push(joueur);
                io.emit('messageServeur', joueurs.length+"/"+nbJoueurs+" joueurs. En attente...");
                if (joueurs.length == nbJoueurs){
                    jeton = 0;
                    io.emit('messageServeur', 'La partie commence');
                    partie();
                }
                let nomsJoueurs = "";
                for (let joueur of joueurs) nomsJoueurs += joueur.get('name')+" ";
                socket.emit('entree', {'nomJoueur':data.nom,
                                       'numJoueur':joueurs.length-1,
                                       'nomsJoueurs':nomsJoueurs});
                if (joueurs.length > 1)
                    socket.broadcast.emit('entreeAutreJoueur',
                                        {'nomJoueur':data.nom,
                                        'nomsJoueurs':nomsJoueurs});
            }
            else socket.emit('messageServeur', 'Nom de joueur déjà enregistré');
        else socket.emit('messageServeur', 'Nombre de joueurs maximal déjà atteint !');
    });

    socket.on('sortie', nomJoueur => {
        console.log("Sortie de la partie de "+nomJoueur);
        let index = joueurs.indexOf(nomJoueur)
        if  (index != -1) {
            joueurs.splice(index, 1);
            jeton = -1;
            let nomsJoueurs = "";
            for (let nom of joueurs) nomsJoueurs += nom+" ";
            socket.emit('sortie', {'nomJoueur':nomJoueur,
                                    'nomsJoueurs':nomsJoueurs});
            socket.broadcast.emit('sortieAutreJoueur',
                                    {'nomJoueur':nomJoueur,
                                    'numJoueur': 0,
                                    'nomsJoueurs':nomsJoueurs});
        }
        else socket.emit('messageServeur', 'Joueur inconnu');
    });

    socket.on('demandeNbJoueurs', function(){
        socket.emit('nbJoueurs', {'nombreMax':nbJoueurs,'nbActuel':joueurs.length});
    });
});